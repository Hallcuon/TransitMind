const express = require('express');
const pool = require('../config/database');
const { findPath } = require('../algorithms/dijkstra');

const router = express.Router();

// 🚀 In-memory cache for OSRM routes (24h TTL)
const routeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to generate cache key
const getCacheKey = (startLat, startLng, endLat, endLng) => {
  return `${startLat.toFixed(3)}-${startLng.toFixed(3)}-${endLat.toFixed(3)}-${endLng.toFixed(3)}`;
};

// Helper function to clear cache entry after TTL
const setCacheWithTTL = (key, value) => {
  routeCache.set(key, value);
  setTimeout(() => {
    if (routeCache.get(key) === value) {
      routeCache.delete(key);
      console.log(`🗑️ Cache expired for key: ${key}`);
    }
  }, CACHE_TTL_MS);
};

const getDirectFallback = (startLat, startLng, endLat, endLng) => ({
  coordinates: [
    { lat: parseFloat(startLat), lng: parseFloat(startLng) },
    { lat: parseFloat(endLat), lng: parseFloat(endLng) },
  ],
  fallback: true,
});

const getDetailedRoadLine = async (startLat, startLng, endLat, endLng) => {
  const cacheKey = getCacheKey(
    parseFloat(startLat),
    parseFloat(startLng),
    parseFloat(endLat),
    parseFloat(endLng)
  );

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(osrmUrl);
    if (!response.ok) {
      const fallback = getDirectFallback(startLat, startLng, endLat, endLng);
      routeCache.set(cacheKey, fallback);
      setTimeout(() => routeCache.delete(cacheKey), 60 * 60 * 1000);
      return fallback;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      const fallback = getDirectFallback(startLat, startLng, endLat, endLng);
      routeCache.set(cacheKey, fallback);
      setTimeout(() => routeCache.delete(cacheKey), 60 * 60 * 1000);
      return fallback;
    }

    const route = data.routes[0];
    const result = {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => ({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      })),
      distance: route.distance,
      duration: route.duration,
    };

    setCacheWithTTL(cacheKey, result);
    return result;
  } catch (error) {
    return getDirectFallback(startLat, startLng, endLat, endLng);
  }
};

const buildOsrmMultiStopRoute = async (points) => {
  let pathCoordinates = [];
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const segment = await getDetailedRoadLine(from.lat, from.lng, to.lat, to.lng);

    const coords = segment.coordinates || [];
    if (coords.length > 0) {
      if (pathCoordinates.length === 0) {
        pathCoordinates = coords;
      } else {
        pathCoordinates.push(...coords.slice(1));
      }
    }

    totalDistanceMeters += Number(segment.distance || 0);
    totalDurationSeconds += Number(segment.duration || 0);
  }

  return {
    pathCoordinates,
    totalDistanceKm: Math.round((totalDistanceMeters / 1000) * 100) / 100,
    totalTimeMinutes: Math.max(1, Math.round(totalDurationSeconds / 60)),
  };
};

const buildDetailedPathCoordinates = async (cityPath, cities) => {
  const waypointCities = cityPath.map((cityId) => cities.find((c) => c.id === cityId)).filter(Boolean);
  let detailedPathCoordinates = [];

  for (let i = 0; i < waypointCities.length - 1; i++) {
    const fromCity = waypointCities[i];
    const toCity = waypointCities[i + 1];
    const segment = await getDetailedRoadLine(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
    const segmentCoords = segment.coordinates || [];

    if (segmentCoords.length === 0) {
      continue;
    }

    if (detailedPathCoordinates.length === 0) {
      detailedPathCoordinates = segmentCoords;
    } else {
      detailedPathCoordinates.push(...segmentCoords.slice(1));
    }
  }

  if (detailedPathCoordinates.length < 2) {
    detailedPathCoordinates = waypointCities.map((city) => ({
      id: city.id,
      name: city.name,
      lat: city.lat,
      lng: city.lng,
    }));
  }

  return detailedPathCoordinates;
};

const buildMultiStopRoute = (cityIds, pathType, cities, roads) => {
  const mergedPath = [];
  const mergedWaypoints = [];
  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 0; i < cityIds.length - 1; i++) {
    const startId = parseInt(cityIds[i]);
    const endId = parseInt(cityIds[i + 1]);
    const segment = findPath(cities, roads, startId, endId, pathType);

    if (segment.error || !segment.path || segment.path.length === 0) {
      return { error: segment.error || `No path between ${startId} and ${endId}` };
    }

    totalDistance += segment.totalDistance;
    totalTime += segment.totalTime;

    if (i === 0) {
      mergedPath.push(...segment.path);
      mergedWaypoints.push(...segment.waypoints);
    } else {
      mergedPath.push(...segment.path.slice(1));
      mergedWaypoints.push(...segment.waypoints.slice(1));
    }
  }

  return {
    path: mergedPath,
    waypoints: mergedWaypoints,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalTime: Math.round(totalTime),
  };
};

/**
 * POST /sessions/find-route
 * Find route between two cities using Dijkstra's algorithm
 * Body: { startCityId, endCityId, pathType: 'shortest'|'longest' }
 */
router.post('/find-route', async (req, res) => {
  try {
    const { startCityId, endCityId, pathType } = req.body;

    console.log(`🔍 Finding route for: ${startCityId} → ${endCityId} (${pathType})`);

    // Validate input
    if (!startCityId || !endCityId || !pathType) {
      return res.status(400).json({ 
        error: 'startCityId, endCityId, and pathType are required' 
      });
    }

    if (!['shortest', 'longest'].includes(pathType)) {
      return res.status(400).json({ 
        error: 'pathType must be "shortest" or "longest"' 
      });
    }

    // Fetch all cities and roads
    const citiesResult = await pool.query('SELECT * FROM cities ORDER BY id');
    const roadsResult = await pool.query('SELECT * FROM roads');

    const cities = citiesResult.rows;
    const roads = roadsResult.rows;

    console.log(`📊 Loaded ${cities.length} cities and ${roads.length} roads`);

    // Verify cities exist
    const startCity = cities.find(c => c.id === parseInt(startCityId));
    const endCity = cities.find(c => c.id === parseInt(endCityId));

    console.log(`✔️ Start city: ${startCity?.name} (id: ${startCity?.id})`);
    console.log(`✔️ End city: ${endCity?.name} (id: ${endCity?.id})`);

    if (!startCity || !endCity) {
      return res.status(404).json({ error: 'One or both cities not found' });
    }

    // Run Dijkstra's algorithm
    console.log(`🔄 Running Dijkstra algorithm...`);
    const routeInfo = findPath(cities, roads, parseInt(startCityId), parseInt(endCityId), pathType);

    console.log(`📍 Route info:`, routeInfo);

    if (routeInfo.error) {
      console.error(`❌ Route error: ${routeInfo.error}`);
      return res.status(404).json({ error: routeInfo.error });
    }

    if (!routeInfo.path || routeInfo.path.length === 0) {
      console.error(`❌ No path returned`);
      return res.status(404).json({ error: 'No path found between cities' });
    }

    // Create session based on found route
    const sessionDurationHours = Math.ceil(routeInfo.totalTime / 60);
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + sessionDurationHours * 60 * 60 * 1000);

    // First: Create a route record in routes table with correct structure
    const routeResult = await pool.query(
      `INSERT INTO routes 
       (name, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km, transport_type, country, waypoints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        `${startCity.name} → ${endCity.name}`,
        startCity.name,
        endCity.name,
        startCity.lat,
        startCity.lng,
        endCity.lat,
        endCity.lng,
        routeInfo.totalTime,
        routeInfo.totalDistance,
        'car',
        'Ukraine',
        JSON.stringify(routeInfo.waypoints),
      ]
    );

    const routeId = routeResult.rows[0].id;
    console.log(`📍 Created route record: ${routeId}`);

    // Insert session
    const sessionResult = await pool.query(
      `INSERT INTO sessions 
       (route_id, start_time, end_time, status, session_type, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, start_time, end_time, status`,
      [routeId, startTime, endTime, 'active', 'single']
    );

    const session = sessionResult.rows[0];

    console.log(`✅ Session created: ${session.id}`);

    const waypointCities = routeInfo.path.map((cityId) => cities.find((c) => c.id === cityId)).filter(Boolean);

    // Build detailed road geometry for each segment between waypoints.
    // This gives a real road-following polyline instead of a straight line.
    let detailedPathCoordinates = [];
    for (let i = 0; i < waypointCities.length - 1; i++) {
      const fromCity = waypointCities[i];
      const toCity = waypointCities[i + 1];
      const segment = await getDetailedRoadLine(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
      const segmentCoords = segment.coordinates || [];

      if (segmentCoords.length === 0) {
        continue;
      }

      if (detailedPathCoordinates.length === 0) {
        detailedPathCoordinates = segmentCoords;
      } else {
        // Skip first coordinate to avoid duplicate join points.
        detailedPathCoordinates.push(...segmentCoords.slice(1));
      }
    }

    if (detailedPathCoordinates.length < 2) {
      detailedPathCoordinates = waypointCities.map((city) => ({
        id: city.id,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
      }));
    }

    res.status(201).json({
      session: {
        id: session.id,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
      },
      route: {
        startCity: startCity.name,
        endCity: endCity.name,
        waypoints: routeInfo.waypoints,
        pathCoordinates: detailedPathCoordinates,
      },
      statistics: {
        totalDistance: routeInfo.totalDistance,
        totalTime: routeInfo.totalTime,
        totalHours: sessionDurationHours,
        stops: routeInfo.waypoints.length - 1, // stops = waypoints - 1 (excluding start)
        pathType: pathType,
      },
    });
  } catch (error) {
    console.error('❌ Error finding route:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to find route', details: error.message });
  }
});

/**
 * POST /find-route-multi
 * Build route through multiple selected stops
 * Body: { cityIds: number[], pathType: 'shortest'|'longest', dryRun?: boolean }
 */
router.post('/find-route-multi', async (req, res) => {
  try {
    const { cityIds = [], pathType = 'shortest', dryRun = false } = req.body;

    if (!Array.isArray(cityIds) || cityIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 cityIds are required' });
    }

    if (!['shortest', 'longest'].includes(pathType)) {
      return res.status(400).json({ error: 'pathType must be "shortest" or "longest"' });
    }

    const normalizedCityIds = cityIds.map((id) => parseInt(id)).filter(Number.isFinite);
    if (normalizedCityIds.length !== cityIds.length) {
      return res.status(400).json({ error: 'cityIds must be numbers' });
    }

    const citiesResult = await pool.query('SELECT * FROM cities ORDER BY id');
    const roadsResult = await pool.query('SELECT * FROM roads');
    const cities = citiesResult.rows;
    const roads = roadsResult.rows;

    const missing = normalizedCityIds.find((id) => !cities.some((c) => c.id === id));
    if (missing) {
      return res.status(404).json({ error: `City with id ${missing} not found` });
    }

    const routeInfo = buildMultiStopRoute(normalizedCityIds, pathType, cities, roads);
    if (routeInfo.error) {
      return res.status(404).json({ error: routeInfo.error });
    }

    const detailedPathCoordinates = await buildDetailedPathCoordinates(routeInfo.path, cities);
    const startCity = cities.find((c) => c.id === normalizedCityIds[0]);
    const endCity = cities.find((c) => c.id === normalizedCityIds[normalizedCityIds.length - 1]);
    const sessionDurationHours = Math.ceil(routeInfo.totalTime / 60);

    if (dryRun) {
      return res.status(200).json({
        route: {
          startCity: startCity.name,
          endCity: endCity.name,
          waypoints: routeInfo.waypoints,
          pathCoordinates: detailedPathCoordinates,
        },
        statistics: {
          totalDistance: routeInfo.totalDistance,
          totalTime: routeInfo.totalTime,
          totalHours: sessionDurationHours,
          stops: routeInfo.waypoints.length - 1,
          pathType,
        },
      });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + sessionDurationHours * 60 * 60 * 1000);

    const routeResult = await pool.query(
      `INSERT INTO routes 
       (name, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km, transport_type, country, waypoints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        routeInfo.waypoints.join(' → '),
        startCity.name,
        endCity.name,
        startCity.lat,
        startCity.lng,
        endCity.lat,
        endCity.lng,
        routeInfo.totalTime,
        routeInfo.totalDistance,
        'car',
        'Ukraine',
        JSON.stringify(routeInfo.waypoints),
      ]
    );

    const routeId = routeResult.rows[0].id;

    const sessionResult = await pool.query(
      `INSERT INTO sessions 
       (route_id, start_time, end_time, status, session_type, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, start_time, end_time, status`,
      [routeId, startTime, endTime, 'active', 'single']
    );
    const session = sessionResult.rows[0];

    return res.status(201).json({
      session: {
        id: session.id,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
      },
      route: {
        startCity: startCity.name,
        endCity: endCity.name,
        waypoints: routeInfo.waypoints,
        pathCoordinates: detailedPathCoordinates,
      },
      statistics: {
        totalDistance: routeInfo.totalDistance,
        totalTime: routeInfo.totalTime,
        totalHours: sessionDurationHours,
        stops: routeInfo.waypoints.length - 1,
        pathType,
      },
    });
  } catch (error) {
    console.error('❌ Error finding multi-stop route:', error.message);
    res.status(500).json({ error: 'Failed to find multi-stop route' });
  }
});

/**
 * POST /find-route-osrm
 * OSRM-first routing for city stops and arbitrary map points.
 * Body: { points: [{ lat, lng, label? }], dryRun?: boolean }
 */
router.post('/find-route-osrm', async (req, res) => {
  try {
    const { points = [], dryRun = true } = req.body;

    if (!Array.isArray(points) || points.length < 2) {
      return res.status(400).json({ error: 'At least 2 points are required' });
    }

    const sanitizedPoints = points
      .map((p, idx) => ({
        label: p.label || `Stop ${idx + 1}`,
        lat: Number(p.lat),
        lng: Number(p.lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .slice(0, 12);

    if (sanitizedPoints.length < 2) {
      return res.status(400).json({ error: 'No valid points provided' });
    }

    const osrm = await buildOsrmMultiStopRoute(sanitizedPoints);
    const waypoints = sanitizedPoints.map((p) => p.label);
    const start = sanitizedPoints[0];
    const end = sanitizedPoints[sanitizedPoints.length - 1];

    if (dryRun) {
      return res.status(200).json({
        route: {
          startCity: waypoints[0],
          endCity: waypoints[waypoints.length - 1],
          waypoints,
          pathCoordinates: osrm.pathCoordinates,
        },
        statistics: {
          totalDistance: osrm.totalDistanceKm,
          totalTime: osrm.totalTimeMinutes,
          totalHours: Math.ceil(osrm.totalTimeMinutes / 60),
          stops: Math.max(0, waypoints.length - 1),
          provider: 'osrm',
        },
      });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + osrm.totalTimeMinutes * 60 * 1000);

    const routeResult = await pool.query(
      `INSERT INTO routes 
       (name, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km, transport_type, country, waypoints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        waypoints.join(' → '),
        waypoints[0],
        waypoints[waypoints.length - 1],
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        osrm.totalTimeMinutes,
        osrm.totalDistanceKm,
        'car',
        'Ukraine',
        JSON.stringify(waypoints),
      ]
    );

    const routeId = routeResult.rows[0].id;

    const sessionResult = await pool.query(
      `INSERT INTO sessions 
       (route_id, start_time, end_time, status, session_type, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, start_time, end_time, status`,
      [routeId, startTime, endTime, 'active', 'single']
    );
    const session = sessionResult.rows[0];

    return res.status(201).json({
      session: {
        id: session.id,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
      },
      route: {
        startCity: waypoints[0],
        endCity: waypoints[waypoints.length - 1],
        waypoints,
        pathCoordinates: osrm.pathCoordinates,
      },
      statistics: {
        totalDistance: osrm.totalDistanceKm,
        totalTime: osrm.totalTimeMinutes,
        totalHours: Math.ceil(osrm.totalTimeMinutes / 60),
        stops: Math.max(0, waypoints.length - 1),
        provider: 'osrm',
      },
    });
  } catch (error) {
    console.error('❌ Error building OSRM route:', error.message);
    res.status(500).json({ error: 'Failed to build OSRM route' });
  }
});

/**
 * GET /cities
 * Get all cities (for map display)
 */
router.get('/cities', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, lat, lng, region FROM cities ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

/**
 * GET /roads
 * Get all roads (for map visualization)
 */
router.get('/roads', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.city_from_id,
        r.city_to_id,
        c1.name as from_name,
        c1.lat as from_lat,
        c1.lng as from_lng,
        c2.name as to_name,
        c2.lat as to_lat,
        c2.lng as to_lng,
        r.distance_km,
        r.driving_time_minutes
      FROM roads r
      JOIN cities c1 ON r.city_from_id = c1.id
      JOIN cities c2 ON r.city_to_id = c2.id
    `);

    console.log(`✅ Loaded ${result.rows.length} roads`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching roads:', error.message);
    res.status(500).json({ error: 'Failed to fetch roads' });
  }
});

/**
 * GET /route-line
 * Get detailed route coordinates from OSRM for drawing curved lines
 * Query params: startLat, startLng, endLat, endLng
 */
router.get('/route-line', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ 
        error: 'startLat, startLng, endLat, endLng are required' 
      });
    }

    const routeLine = await getDetailedRoadLine(startLat, startLng, endLat, endLng);
    res.json(routeLine);
  } catch (error) {
    console.error('❌ Error getting route line:', error.message);
    // Fallback to direct line
    const { startLat, startLng, endLat, endLng } = req.query;
    res.json({ 
      coordinates: [
        { lat: parseFloat(startLat), lng: parseFloat(startLng) },
        { lat: parseFloat(endLat), lng: parseFloat(endLng) },
      ],
      fallback: true,
      error: error.message,
    });
  }
});

module.exports = router;
