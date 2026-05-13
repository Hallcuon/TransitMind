/**
 * Legacy one-off: ensure `country` on routes. For full schema cleanup run: npm run migrate:core
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const runMigrations = async () => {
  try {
    console.log('🔄 Running legacy route column check...');

    const checkCountry = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'routes' AND column_name = 'country'
      );
    `);

    if (!checkCountry.rows[0].exists) {
      console.log('📍 Adding country column to routes...');
      await pool.query(`
        ALTER TABLE routes ADD COLUMN country VARCHAR(50) DEFAULT 'Ukraine';
      `);
      console.log('✅ country column added to routes');
    } else {
      console.log('✅ country column already exists in routes');
    }

    await pool.query(`UPDATE routes SET country = 'Ukraine' WHERE country IS NULL;`);

    console.log('✅ Done. If you have not run `npm run migrate:core` yet, run it to drop social/user tables.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
