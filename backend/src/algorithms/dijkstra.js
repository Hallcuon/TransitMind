/**
 * Dijkstra's Algorithm for shortest/longest path in Ukraine graph
 */

/**
 * Find shortest or longest path between two cities using appropriate algorithm
 * @param {Array} cities - All cities
 * @param {Array} roads - All roads
 * @param {number} startId - Starting city ID
 * @param {number} endId - Destination city ID
 * @param {string} type - 'shortest' or 'longest'
 * @returns {Object} {path: [cityIds], totalDistance, totalTime, waypoints: [cityNames]}
 */
function findPath(cities, roads, startId, endId, type = 'shortest') {
  if (startId === endId) {
    return {
      path: [startId],
      totalDistance: 0,
      totalTime: 0,
      waypoints: [cities.find(c => c.id === startId).name],
    };
  }

  // Build adjacency list from roads
  const graph = {};
  cities.forEach(city => {
    graph[city.id] = [];
  });

  roads.forEach(road => {
    graph[road.city_from_id].push({
      to: road.city_to_id,
      distance: parseFloat(road.distance_km),
      time: parseInt(road.driving_time_minutes),
    });
  });

  if (type === 'shortest') {
    // Use Dijkstra for shortest path
    return dijkstra(cities, graph, startId, endId);
  } else {
    // Use DFS with DP for longest path
    return longestPathDFS(cities, graph, roads, startId, endId);
  }
}

/**
 * Dijkstra's algorithm for shortest path
 */
function dijkstra(cities, graph, startId, endId) {
  const distances = {};
  const parents = {};
  const visited = new Set();

  cities.forEach(city => {
    distances[city.id] = Infinity;
    parents[city.id] = null;
  });

  distances[startId] = 0;

  // Dijkstra's algorithm
  for (let i = 0; i < cities.length; i++) {
    let current = null;

    // Find unvisited city with minimum distance
    for (const cityId in distances) {
      if (!visited.has(parseInt(cityId))) {
        if (current === null || distances[cityId] < distances[current]) {
          current = parseInt(cityId);
        }
      }
    }

    if (current === null || distances[current] === Infinity) {
      break;
    }

    visited.add(current);

    // Update neighbors
    if (graph[current]) {
      graph[current].forEach(edge => {
        const altDistance = distances[current] + edge.distance;

        if (altDistance < distances[edge.to]) {
          distances[edge.to] = altDistance;
          parents[edge.to] = current;
        }
      });
    }
  }

  // Reconstruct path
  const path = [];
  let current = endId;

  while (current !== null) {
    path.unshift(current);
    current = parents[current];
  }

  if (path[0] !== startId) {
    // No path found
    return {
      path: [],
      totalDistance: 0,
      totalTime: 0,
      waypoints: [],
      error: 'No path found between cities',
    };
  }

  // Calculate total distance and time
  let totalDistance = 0;
  let totalTime = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edge = graph[from].find(e => e.to === to);
    if (edge) {
      totalDistance += edge.distance;
      totalTime += edge.time;
    }
  }

  // Get city names for waypoints
  const waypoints = path.map(cityId => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.name : null;
  });

  return {
    path,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalTime,
    waypoints,
  };
}

/**
 * DFS for longest path in cyclic graphs
 * Limited depth to prevent infinite recursion, maximizes DISTANCE not hop count
 */
function longestPathDFS(cities, graph, roads, startId, endId) {
  // First, calculate shortest path as baseline
  const shortestResult = dijkstra(cities, graph, startId, endId);
  const shortestDistance = shortestResult.totalDistance || 0;
  
  // Limit longest path to max 6 intermediate cities (7 total including start/end)
  // This prevents absurdly long detours while still allowing interesting alternatives
  const maxDepth = 6;
  let bestPath = null;
  let bestDistance = shortestDistance; // Initialize to shortest distance so we find at least that
  let bestTime = 0;

  function dfsHelper(currentId, targetId, visited, currentPath, currentDistance, currentTime, depth) {
    // If reached target
    if (currentId === targetId) {
      if (currentDistance > bestDistance) {
        bestDistance = currentDistance;
        bestTime = currentTime;
        bestPath = [...currentPath];
      }
      return;
    }

    // Prevent infinite recursion - stop if depth exceeded
    if (depth >= maxDepth) {
      return;
    }

    // Try all neighbors
    if (graph[currentId]) {
      for (const edge of graph[currentId]) {
        // Skip visited nodes to prevent cycles
        if (visited.has(edge.to)) {
          continue;
        }

        visited.add(edge.to);
        currentPath.push(edge.to);
        
        dfsHelper(
          edge.to,
          targetId,
          visited,
          currentPath,
          currentDistance + edge.distance,
          currentTime + edge.time,
          depth + 1
        );

        currentPath.pop();
        visited.delete(edge.to);
      }
    }
  }

  const visited = new Set([startId]);
  dfsHelper(startId, endId, visited, [startId], 0, 0, 0);

  if (!bestPath) {
    return {
      path: null,
      totalDistance: null,
      totalTime: null,
      waypoints: null,
      error: 'No path found between cities',
    };
  }

  // Get city names for waypoints
  const waypoints = bestPath.map(cityId => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.name : null;
  });

  return {
    path: bestPath,
    totalDistance: Math.round(bestDistance * 100) / 100,
    totalTime: bestTime,
    waypoints,
  };
}

module.exports = { findPath };
