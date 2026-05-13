const pool = require('./src/config/database');

(async () => {
  try {
    console.log('🔄 Migrating database for Dijkstra routing...\n');

    // 1. Create cities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        lat DECIMAL(10, 6) NOT NULL,
        lng DECIMAL(10, 6) NOT NULL,
        region VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Cities table created/verified');

    // 2. Create roads table (edges in graph)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roads (
        id SERIAL PRIMARY KEY,
        city_from_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        city_to_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
        distance_km DECIMAL(10, 2) NOT NULL,
        driving_time_minutes INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(city_from_id, city_to_id)
      )
    `);
    console.log('✅ Roads table created/verified');

    // 3. Create indices for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_roads_from ON roads(city_from_id);
      CREATE INDEX IF NOT EXISTS idx_roads_to ON roads(city_to_id);
    `);
    console.log('✅ Indices created');

    // 4. Clean old routes if they exist (keep backup)
    const routeCount = await pool.query(`SELECT COUNT(*) as count FROM routes`);
    if (routeCount.rows[0].count > 0) {
      console.log(`⚠️  Found ${routeCount.rows[0].count} old routes - these will be replaced by Dijkstra routing`);
    }

    console.log('\n✅ Migration complete! Ready to seed cities and roads.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration error:', e.message);
    process.exit(1);
  }
})();
