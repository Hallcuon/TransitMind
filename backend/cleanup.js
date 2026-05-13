const pool = require('./src/config/database');

const cleanup = async () => {
  try {
    console.log('🧹 Completing active sessions (dev utility)...');

    const sessionRes = await pool.query(
      `UPDATE sessions SET status = 'completed', updated_at = NOW() WHERE status = 'active'`
    );
    console.log(`✅ Closed ${sessionRes.rowCount} session(s)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

cleanup();
