const { findPath } = require('../../src/algorithms/dijkstra');

describe('Dijkstra Algorithm', () => {
  // Sample data - 5 cities
  const cities = [
    { id: 1, name: 'Kyiv', lat: 50.45, lng: 30.52, region: 'Kyiv' },
    { id: 2, name: 'Lviv', lat: 49.84, lng: 24.03, region: 'Lviv' },
    { id: 3, name: 'Kharkiv', lat: 49.99, lng: 36.23, region: 'Kharkiv' },
    { id: 4, name: 'Odesa', lat: 46.48, lng: 30.74, region: 'Odesa' },
    { id: 5, name: 'Dnipro', lat: 48.45, lng: 35.04, region: 'Dnipro' },
  ];

  const roads = [
    { city_from_id: 1, city_to_id: 2, distance_km: 540, driving_time_minutes: 480 },
    { city_from_id: 1, city_to_id: 3, distance_km: 410, driving_time_minutes: 360 },
    { city_from_id: 1, city_to_id: 5, distance_km: 380, driving_time_minutes: 320 },
    { city_from_id: 2, city_to_id: 1, distance_km: 540, driving_time_minutes: 480 },
    { city_from_id: 3, city_to_id: 1, distance_km: 410, driving_time_minutes: 360 },
    { city_from_id: 3, city_to_id: 5, distance_km: 120, driving_time_minutes: 90 },
    { city_from_id: 4, city_to_id: 1, distance_km: 460, driving_time_minutes: 420 },
    { city_from_id: 5, city_to_id: 1, distance_km: 380, driving_time_minutes: 320 },
    { city_from_id: 5, city_to_id: 3, distance_km: 120, driving_time_minutes: 90 },
  ];

  test('should find shortest path between two cities', () => {
    const result = findPath(cities, roads, 1, 3, 'shortest');

    expect(result).toBeDefined();
    expect(result.path).toBeDefined();
    expect(result.path).toBeInstanceOf(Array);
    expect(result.path).toContain(1);
    expect(result.path).toContain(3);
    expect(result.waypoints).toBeInstanceOf(Array);
    expect(result.waypoints).toContain('Kyiv');
    expect(result.waypoints).toContain('Kharkiv');
    expect(result.totalDistance).toBeGreaterThan(0);
  });

  test('should find direct path when available (shortest)', () => {
    const result = findPath(cities, roads, 1, 2, 'shortest');

    expect(result.path).toEqual([1, 2]);
    expect(result.totalDistance).toBe(540);
    expect(result.waypoints).toEqual(['Kyiv', 'Lviv']);
  });

  test('should prefer shorter route over direct path', () => {
    // Kyiv → Dnipro is 380 direct
    // Kyiv → Kharkiv → Dnipro is 410 + 120 = 530
    // Should return direct path
    const result = findPath(cities, roads, 1, 5, 'shortest');

    expect(result.path).toEqual([1, 5]);
    expect(result.totalDistance).toBe(380);
  });

  test('should handle longest path (DFS)', () => {
    const result = findPath(cities, roads, 1, 3, 'longest');

    expect(result).toBeDefined();
    expect(result.path).toBeDefined();
    expect(result.path[0]).toBe(1);
    expect(result.path[result.path.length - 1]).toBe(3);
    expect(result.totalDistance).toBeGreaterThan(0);
    expect(result.waypoints.length).toBe(result.path.length);
  });

  test('should handle same start and end city', () => {
    const result = findPath(cities, roads, 1, 1, 'shortest');

    expect(result.path).toEqual([1]);
    expect(result.totalDistance).toBe(0);
    expect(result.waypoints).toEqual(['Kyiv']);
  });

  test('should return empty array for non-existent route', () => {
    // Only 5 cities, no connection to city 6
    const result = findPath(cities, roads, 1, 99, 'shortest');

    expect(result.path).toEqual([]);
    expect(result.waypoints).toEqual([]);
    expect(result.totalDistance).toBe(0);
  });

  test('should calculate driving time correctly', () => {
    const result = findPath(cities, roads, 1, 2, 'shortest');

    expect(result.totalDrivingTime).toBe(480); // Direct path is 480 minutes
  });
});
