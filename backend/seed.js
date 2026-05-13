const pool = require('./src/config/database');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    try {
      await pool.query('ALTER TABLE routes ADD COLUMN distance_km DECIMAL(10, 2)');
    } catch {
      /* exists */
    }

    console.log('Clearing sessions and routes...');
    await pool.query('TRUNCATE TABLE sessions RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE routes RESTART IDENTITY CASCADE');

    console.log('Inserting routes...');
    const routesData = [
      ['London to Paris', 'Flight across the English Channel', 'flight', 'London', 'Paris', 51.5074, -0.1278, 48.8566, 2.3522, 60, 340],
      ['NYC to Boston', 'Express train up the East Coast', 'train', 'New York', 'Boston', 40.7128, -74.006, 42.3601, -71.0589, 45, 380],
      ['Sydney to Melbourne', 'Flight across Australia', 'flight', 'Sydney', 'Melbourne', -33.8688, 151.2093, -37.8136, 144.9631, 90, 715],
      ['Berlin to Amsterdam', 'Train through the Netherlands', 'train', 'Berlin', 'Amsterdam', 52.52, 13.405, 52.3676, 4.9041, 75, 580],
      ['Tokyo to Osaka', 'Bullet train (Shinkansen)', 'train', 'Tokyo', 'Osaka', 35.6762, 139.6503, 34.6937, 135.5023, 30, 515],
      ['Dubai to Abu Dhabi', 'Short flight in UAE', 'flight', 'Dubai', 'Abu Dhabi', 25.2048, 55.2708, 24.4539, 54.3773, 25, 140],
      ['Toronto to Montreal', 'Flight to Canada', 'flight', 'Toronto', 'Montreal', 43.6532, -79.3832, 45.5017, -73.5673, 50, 335],
      ['Madrid to Barcelona', 'Fast train across Spain', 'train', 'Madrid', 'Barcelona', 40.4168, -3.7038, 41.3851, 2.1734, 65, 625],
      ['Bangkok to Phuket', 'Flight to island resort', 'flight', 'Bangkok', 'Phuket', 13.7563, 100.5018, 8.1194, 98.2839, 55, 845],
      [
        'Singapore to Kuala Lumpur',
        'Short flight in Southeast Asia',
        'flight',
        'Singapore',
        'Kuala Lumpur',
        1.3521,
        103.8198,
        3.139,
        101.6869,
        35,
        400,
      ],
    ];

    for (const route of routesData) {
      await pool.query(
        `INSERT INTO routes (name, description, transport_type, start_city, end_city,
         start_lat, start_lng, end_lat, end_lng, duration_minutes, distance_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        route
      );
    }

    const routeCount = await pool.query('SELECT COUNT(*) as count FROM routes');
    console.log(`✅ Seed complete. Routes: ${routeCount.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
