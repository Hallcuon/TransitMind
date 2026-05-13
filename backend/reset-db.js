require('dotenv').config();
const pool = require('./src/config/database');

const CITIES = {
  Germany: [
    { name: 'Berlin', lat: 52.52, lng: 13.405 },
    { name: 'Dresden', lat: 51.0504, lng: 13.7373 },
    { name: 'Leipzig', lat: 51.3397, lng: 12.3731 },
  ],
  Poland: [
    { name: 'Warsaw', lat: 52.2297, lng: 21.0122 },
    { name: 'Krakow', lat: 50.0647, lng: 19.945 },
    { name: 'Wroclaw', lat: 51.1079, lng: 17.0385 },
  ],
};

const TRANSPORT_SPEEDS = {
  flight: 800,
  train: 120,
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

const resetAndSeed = async () => {
  try {
    console.log('🔄 Resetting database...\n');

    console.log('🗑️  Clearing sessions and routes...');
    await pool.query('TRUNCATE TABLE sessions RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE routes RESTART IDENTITY CASCADE');
    console.log('✅ Cleared\n');

    const routes = [
      {
        startCountry: 'Germany',
        startCity: 'Berlin',
        endCountry: 'Germany',
        endCity: 'Dresden',
        type: 'flight',
        desc: 'Quick flight from Berlin to Dresden',
      },
      {
        startCountry: 'Germany',
        startCity: 'Berlin',
        endCountry: 'Germany',
        endCity: 'Dresden',
        type: 'train',
        desc: 'Express train from Berlin to Dresden',
      },
      {
        startCountry: 'Germany',
        startCity: 'Dresden',
        endCountry: 'Germany',
        endCity: 'Leipzig',
        type: 'flight',
        desc: 'Flight from Dresden to Leipzig',
      },
      {
        startCountry: 'Germany',
        startCity: 'Dresden',
        endCountry: 'Germany',
        endCity: 'Leipzig',
        type: 'train',
        desc: 'Train journey from Dresden to Leipzig',
      },
      {
        startCountry: 'Germany',
        startCity: 'Berlin',
        endCountry: 'Germany',
        endCity: 'Leipzig',
        type: 'flight',
        desc: 'Direct flight from Berlin to Leipzig',
      },
      {
        startCountry: 'Germany',
        startCity: 'Berlin',
        endCountry: 'Germany',
        endCity: 'Leipzig',
        type: 'train',
        desc: 'Regional train from Berlin to Leipzig',
      },
      {
        startCountry: 'Poland',
        startCity: 'Warsaw',
        endCountry: 'Poland',
        endCity: 'Wroclaw',
        type: 'flight',
        desc: 'Flight from Warsaw to Wroclaw',
      },
      {
        startCountry: 'Poland',
        startCity: 'Warsaw',
        endCountry: 'Poland',
        endCity: 'Wroclaw',
        type: 'train',
        desc: 'Train from Warsaw to Wroclaw',
      },
      {
        startCountry: 'Poland',
        startCity: 'Wroclaw',
        endCountry: 'Poland',
        endCity: 'Krakow',
        type: 'flight',
        desc: 'Flight from Wroclaw to Krakow',
      },
      {
        startCountry: 'Poland',
        startCity: 'Wroclaw',
        endCountry: 'Poland',
        endCity: 'Krakow',
        type: 'train',
        desc: 'Scenic train from Wroclaw to Krakow',
      },
      {
        startCountry: 'Poland',
        startCity: 'Warsaw',
        endCountry: 'Poland',
        endCity: 'Krakow',
        type: 'flight',
        desc: 'Direct flight from Warsaw to Krakow',
      },
      {
        startCountry: 'Poland',
        startCity: 'Warsaw',
        endCountry: 'Poland',
        endCity: 'Krakow',
        type: 'train',
        desc: 'Express train from Warsaw to Krakow',
      },
    ];

    console.log('🚀 Creating test routes...\n');

    for (const route of routes) {
      const startCity = CITIES[route.startCountry].find((c) => c.name === route.startCity);
      const endCity = CITIES[route.endCountry].find((c) => c.name === route.endCity);

      const distance = calculateDistance(startCity.lat, startCity.lng, endCity.lat, endCity.lng);
      const duration = calculateDuration(distance, route.type);

      await pool.query(
        `INSERT INTO routes
         (name, description, transport_type, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km, country, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          `${route.startCity} to ${route.endCity}`,
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
          route.startCountry,
        ]
      );

      console.log(
        `✅ [${route.startCountry}] ${route.startCity} → [${route.endCountry}] ${route.endCity}`
      );
    }

    console.log('\n📊 Total routes:', (await pool.query('SELECT COUNT(*) FROM routes')).rows[0].count);
    console.log('\n✨ Database successfully reset and seeded!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAndSeed();
