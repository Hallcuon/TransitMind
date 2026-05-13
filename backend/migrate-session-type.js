const pool = require('./src/config/database');

(async () => {
  try {
    // Add session_type column if doesn't exist
    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'single'
    `);
    console.log('✅ session_type column added/verified');

    // Remove existing public sessions (clean slate)
    const deleteResult = await pool.query(`
      DELETE FROM sessions 
      WHERE session_type = 'public' OR status = 'scheduled'
    `);
    console.log(`✅ Removed ${deleteResult.rowCount} existing public sessions`);

    // All remaining sessions are single sessions - ensure they're marked as such
    await pool.query(`
      UPDATE sessions 
      SET session_type = 'single' 
      WHERE session_type IS NULL OR session_type != 'public'
    `);
    console.log('✅ Marked all remaining sessions as single');

    process.exit(0);
  } catch (e) {
    console.error('❌ Migration error:', e.message);
    process.exit(1);
  }
})();
