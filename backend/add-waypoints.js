require('dotenv').config();
const pool = require('./src/config/database');
const { generateWaypoints } = require('./src/utils/waypointGenerator');

const addWaypoints = async () => {
  try {
    console.log('🛣️  Adding waypoints to routes...\n');

    // 1. Add waypoints column if it doesn't exist
    console.log('📋 Checking database schema...');
    try {
      await pool.query(`
        ALTER TABLE routes ADD COLUMN waypoints JSONB DEFAULT '[]'::jsonb;
      `);
      console.log('✅ waypoints column created\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✅ waypoints column already exists\n');
      } else {
        throw err;
      }
    }

    // 2. Get all routes
    const routes = await pool.query(`
      SELECT id, start_lat, start_lng, end_lat, end_lng FROM routes;
    `);

    console.log(`🚀 Generating waypoints for ${routes.rows.length} routes...\n`);

    // 3. Generate and store waypoints for each route
    for (const route of routes.rows) {
      const waypoints = generateWaypoints(
        parseFloat(route.start_lat),
        parseFloat(route.start_lng),
        parseFloat(route.end_lat),
        parseFloat(route.end_lng),
        7 // Generate 7 waypoints (includes start and end)
      );

      // Store as JSON
      await pool.query(
        `UPDATE routes SET waypoints = $1 WHERE id = $2;`,
        [JSON.stringify(waypoints), route.id]
      );

      console.log(`✅ Route ${route.id}: ${waypoints.length} waypoints generated`);
    }

    // 4. Verify
    const result = await pool.query(`
      SELECT id, start_city, end_city, 
             jsonb_array_length(waypoints) as waypoint_count
      FROM routes
      ORDER BY id;
    `);

    console.log('\n📊 Waypoints verification:');
    result.rows.forEach(row => {
      console.log(`   Route ${row.id}: ${row.start_city} → ${row.end_city} (${row.waypoint_count} waypoints)`);
    });

    console.log('\n✨ All routes updated with realistic curved paths!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

addWaypoints();
