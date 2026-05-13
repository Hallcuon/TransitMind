const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, transport_type, 
              start_city, end_city, start_lat, start_lng, 
              end_lat, end_lng, duration_minutes, distance_km, country, waypoints
       FROM routes 
       ORDER BY name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, description, transport_type, 
              start_city, end_city, start_lat, start_lng, 
              end_lat, end_lng, duration_minutes, distance_km, country, waypoints
       FROM routes 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

router.post('/:routeId/sessions/start', async (req, res) => {
  try {
    const { routeId } = req.params;

    const routeCheck = await pool.query(`SELECT id, name FROM routes WHERE id = $1`, [routeId]);

    if (routeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const sessionResult = await pool.query(
      `INSERT INTO sessions 
       (route_id, start_time, end_time, status, session_type, created_at, updated_at)
       VALUES ($1, NOW(), NOW() + INTERVAL '1 hour', 'active', 'single', NOW(), NOW())
       RETURNING id, route_id, start_time, status, session_type`,
      [routeId]
    );

    const newSession = sessionResult.rows[0];

    res.status(201).json({
      message: 'Session started',
      session: {
        id: newSession.id,
        route_id: newSession.route_id,
        start_time: newSession.start_time,
        status: newSession.status,
      },
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

module.exports = router;
