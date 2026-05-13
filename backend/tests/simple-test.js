/**
 * Simple integration tests for routing algorithm
 * Run: node tests/simple-test.js
 */

const { findPath } = require('../src/algorithms/dijkstra');

// Sample test data
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

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passedTests++;
  } else {
    console.log(`❌ ${message}`);
    failedTests++;
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ ${message}`);
    passedTests++;
  } else {
    console.log(`❌ ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual: ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

console.log('\n🧪 Running Dijkstra Algorithm Tests\n');

// Test 1: Direct shortest path
console.log('Test 1: Direct shortest path Kyiv → Lviv');
const result1 = findPath(cities, roads, 1, 2, 'shortest');
assertEqual(result1.path, [1, 2], 'Path should be [1, 2]');
assertEqual(result1.totalDistance, 540, 'Distance should be 540 km');
assertEqual(result1.waypoints, ['Kyiv', 'Lviv'], 'Waypoints should be [Kyiv, Lviv]');

// Test 2: Shortest path with intermediate city
console.log('\nTest 2: Shortest path Kyiv → Dnipro');
const result2 = findPath(cities, roads, 1, 5, 'shortest');
assertEqual(result2.path, [1, 5], 'Path should be direct [1, 5]');
assertEqual(result2.totalDistance, 380, 'Distance should be 380 km');

// Test 3: Shortest path with multiple hops
console.log('\nTest 3: Shortest path Kyiv → Kharkiv');
const result3 = findPath(cities, roads, 1, 3, 'shortest');
assert(result3.path[0] === 1, 'Path should start with 1');
assert(result3.path[result3.path.length - 1] === 3, 'Path should end with 3');
assert(result3.totalDistance > 0, 'Distance should be positive');

// Test 4: Same city (edge case)
console.log('\nTest 4: Same start and end city');
const result4 = findPath(cities, roads, 1, 1, 'shortest');
assertEqual(result4.path, [1], 'Path should be [1]');
assertEqual(result4.totalDistance, 0, 'Distance should be 0');
assertEqual(result4.waypoints, ['Kyiv'], 'Waypoints should be [Kyiv]');

// Test 5: Non-existent path
console.log('\nTest 5: Non-existent path (city 1 → city 4)');
const result5 = findPath(cities, roads, 1, 4, 'shortest');
assert(result5.path === null || result5.path.length === 0, 'Path should be null or empty array');
assert(result5.totalDistance === null || result5.totalDistance === 0, 'Distance should be null or 0');

// Test 6: Longest path
console.log('\nTest 6: Longest path Kyiv → Kharkiv');
const result6 = findPath(cities, roads, 1, 3, 'longest');
assert(result6.path.length > 1, 'Longest path should have multiple cities');
assert(result6.totalDistance >= 410, 'Longest path distance should be ≥ 410');

console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tests failed!');
  process.exit(1);
}
