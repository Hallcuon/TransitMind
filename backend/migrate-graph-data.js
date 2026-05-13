require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrationPath = path.join(__dirname, 'src', 'migrations', 'expand_ukraine_graph_data.sql');

(async () => {
  try {
    console.log('🔄 Applying graph data migration...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Graph data migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Graph data migration failed:', error.message);
    process.exit(1);
  }
})();
