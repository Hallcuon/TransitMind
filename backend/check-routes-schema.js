const pool = require('./src/config/database');

(async () => {
  try {
    // Check columns in routes table
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'routes'
      ORDER BY ordinal_position
    `);

    console.log('📋 Routes table columns:');
    columnsRes.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Get first route
    const routesRes = await pool.query('SELECT * FROM routes LIMIT 1');
    if (routesRes.rows.length > 0) {
      console.log('\n✅ First route:', routesRes.rows[0]);
    } else {
      console.log('\n⚠️  No routes found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
