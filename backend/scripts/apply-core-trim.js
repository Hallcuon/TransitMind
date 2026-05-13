/**
 * Applies 004_core_schema_trim.sql. Run: npm run migrate:core
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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

const sqlPath = path.join(__dirname, '../src/migrations/004_core_schema_trim.sql');

function splitSql(content) {
  return content
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (t.startsWith('--')) return '';
      return line;
    })
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

(async () => {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const parts = splitSql(sql);
    await client.query('BEGIN');
    for (const part of parts) {
      await client.query(part);
    }
    await client.query('COMMIT');
    console.log('✅ Core trim migration applied (%s statements)', parts.length);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
