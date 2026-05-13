require('dotenv').config();
const pool = require('./src/config/database');

const diagnose = async () => {
  try {
    console.log('🔍 Diagnosing routes table...\n');
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'routes'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Routes table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Check total routes
    const routeCount = await pool.query('SELECT COUNT(*) FROM routes;');
    console.log(`\n📊 Total routes: ${routeCount.rows[0].count}`);
    
    // Check countries in routes
    const countries = await pool.query(`
      SELECT DISTINCT country, COUNT(*) as count
      FROM routes
      GROUP BY country
      ORDER BY count DESC;
    `);
    
    console.log('\n🌍 Countries in routes:');
    if (countries.rows.length === 0) {
      console.log('  ❌ NO COUNTRIES FOUND - routes table is missing country data!');
    } else {
      countries.rows.forEach(row => {
        console.log(`  - ${row.country}: ${row.count} routes`);
      });
    }
    
    // Sample routes
    const sample = await pool.query(`
      SELECT id, name, start_city, end_city, country FROM routes LIMIT 3;
    `);
    
    console.log('\n📌 Sample routes:');
    sample.rows.forEach(route => {
      console.log(`  - ID ${route.id}: ${route.start_city} → ${route.end_city} [Country: ${route.country}]`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  }
};

diagnose();
