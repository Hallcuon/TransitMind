require('dotenv').config();
const pool = require('./src/config/database');

// Ukrainian cities with coordinates from routeConstants
const CITIES = [
  { name: 'Kyiv', lat: 50.4501, lng: 30.5234 },
  { name: 'Lviv', lat: 49.8397, lng: 24.0297 },
  { name: 'Kharkiv', lat: 50.0038, lng: 36.2304 },
  { name: 'Odesa', lat: 46.4757, lng: 30.7325 },
  { name: 'Dnipro', lat: 48.4647, lng: 35.0461 },
  { name: 'Donestk', lat: 47.9601, lng: 37.8063 },
  { name: 'Zaporizhzhia', lat: 47.8388, lng: 35.1851 },
  { name: 'Mykolaiv', lat: 46.9751, lng: 31.9946 },
  { name: 'Poltava', lat: 49.5883, lng: 34.5514 },
  { name: 'Chernihiv', lat: 51.4982, lng: 31.2893 },
];

const TRANSPORT_SPEEDS = {
  flight: 800,
  train: 120,
  metro: 40,
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const calculateDuration = (distance, transportType) => {
  const speed = TRANSPORT_SPEEDS[transportType] || 100;
  const hours = distance / speed;
  const minutes = Math.round(hours * 60);
  return Math.max(minutes, 15);
};

const seedUkrainianRoutes = async () => {
  try {
    console.log('🌱 Seeding Ukrainian routes...\n');

    // Clear existing routes
    console.log('🗑️  Clearing existing routes...');
    await pool.query('TRUNCATE TABLE routes CASCADE');

    const routes = [
      // Flight routes
      { start: 'Kyiv', end: 'Lviv', type: 'flight', desc: 'Direct flight to Western Ukraine' },
      { start: 'Kyiv', end: 'Odesa', type: 'flight', desc: 'Flight to the Black Sea coast' },
      { start: 'Kyiv', end: 'Kharkiv', type: 'flight', desc: 'Flight to Eastern Ukraine' },
      { start: 'Lviv', end: 'Odesa', type: 'flight', desc: 'Scenic flight across Ukraine' },
      
      // Train routes
      { start: 'Kyiv', end: 'Lviv', type: 'train', desc: 'Overnight train to Western Ukraine' },
      { start: 'Kyiv', end: 'Kharkiv', type: 'train', desc: 'Fast train to Eastern Ukraine' },
      { start: 'Kyiv', end: 'Odesa', type: 'train', desc: 'Scenic train journey to the sea' },
      { start: 'Lviv', end: 'Chernihiv', type: 'train', desc: 'Train through historic regions' },
      { start: 'Kharkiv', end: 'Dnipro', type: 'train', desc: 'Regional train connection' },
      { start: 'Odesa', end: 'Mykolaiv', type: 'train', desc: 'Coastal train route' },
      
      // Metro routes (short distance)
      { start: 'Kyiv', end: 'Poltava', type: 'metro', desc: 'Local rapid transit network' },
      { start: 'Kharkiv', end: 'Poltava', type: 'metro', desc: 'Regional metro connection' },
    ];

    for (const route of routes) {
      const startCity = CITIES.find(c => c.name === route.start);
      const endCity = CITIES.find(c => c.name === route.end);

      if (!startCity || !endCity) {
        console.log(`⚠️  Skipping route: ${route.start} → ${route.end} (city not found)`);
        continue;
      }

      const distance = calculateDistance(startCity.lat, startCity.lng, endCity.lat, endCity.lng);
      const duration = calculateDuration(distance, route.type);

      const result = await pool.query(
        `INSERT INTO routes 
         (name, description, transport_type, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km, country, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         RETURNING id`,
        [
          `${route.start} to ${route.end}`,
          route.desc,
          route.type,
          startCity.name,
          endCity.name,
          startCity.lat,
          startCity.lng,
          endCity.lat,
          endCity.lng,
          duration,
          distance,
          'Ukraine',
        ]
      );

      console.log(`✅ Created: ${route.start} → ${route.end} (${route.type}) - ${distance}km, ${duration}min`);
    }

    // Verify
    const count = await pool.query('SELECT COUNT(*) FROM routes WHERE country = $1', ['Ukraine']);
    console.log(`\n✨ Total Ukrainian routes created: ${count.rows[0].count}`);

    const countries = await pool.query(`
      SELECT DISTINCT country, COUNT(*) as count FROM routes GROUP BY country;
    `);
    console.log('\n📊 Countries in database:');
    countries.rows.forEach(row => {
      console.log(`  - ${row.country}: ${row.count} routes`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedUkrainianRoutes();
