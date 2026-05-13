const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TransitMind Backend is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TransitMind Backend is running' });
});

app.use('/api/routes', require('./routes/routes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/dijkstra', require('./routes/dijkstra'));
app.use('/api/context', require('./routes/context'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 TransitMind Backend running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
});

module.exports = app;
