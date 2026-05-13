-- TransitMind minimal schema (routes → sessions; graph for dijkstra/OSRM).
-- Apply core trim: backend npm run migrate:core

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roads (
  id SERIAL PRIMARY KEY,
  city_from_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  city_to_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  distance_km DECIMAL(8, 2) NOT NULL,
  driving_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  transport_type VARCHAR(20) NOT NULL,
  start_city VARCHAR(100) NOT NULL,
  end_city VARCHAR(100) NOT NULL,
  start_lat DECIMAL(10, 6) NOT NULL,
  start_lng DECIMAL(10, 6) NOT NULL,
  end_lat DECIMAL(10, 6) NOT NULL,
  end_lng DECIMAL(10, 6) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  distance_km DECIMAL(8, 2),
  country VARCHAR(50) DEFAULT 'Ukraine',
  waypoints JSONB
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  session_type VARCHAR(20) DEFAULT 'single'
);

CREATE INDEX IF NOT EXISTS idx_sessions_route_id ON sessions(route_id);
CREATE INDEX IF NOT EXISTS idx_roads_city_from ON roads(city_from_id);
CREATE INDEX IF NOT EXISTS idx_roads_city_to ON roads(city_to_id);
