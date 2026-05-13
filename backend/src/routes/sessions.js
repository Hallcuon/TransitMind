const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionResult = await pool.query(
      `SELECT 
         s.id, s.route_id, s.start_time, s.end_time, s.status,
         s.session_type,
         r.name as route_name, r.start_city, r.end_city, r.transport_type, r.duration_minutes,
         r.start_lat, r.start_lng, r.end_lat, r.end_lng, r.waypoints
       FROM sessions s
       JOIN routes r ON s.route_id = r.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    res.json({
      ...session,
      participants: [],
      current_participants: 0,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.post('/:sessionId/leave', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `UPDATE sessions 
       SET status = 'completed', updated_at = NOW() 
       WHERE id = $1 AND status = 'active'
       RETURNING id, status`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or already ended' });
    }

    res.json({
      message: 'Session ended',
      session: result.rows[0],
    });
  } catch (error) {
    console.error('Error leaving session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

module.exports = router;
