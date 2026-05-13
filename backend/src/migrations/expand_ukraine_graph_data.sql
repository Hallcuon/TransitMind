-- Expand and rebalance city graph without destructive deletes.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roads (
  id SERIAL PRIMARY KEY,
  city_from_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  city_to_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  distance_km DECIMAL(10, 2) NOT NULL,
  driving_time_minutes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city_from_id, city_to_id)
);

CREATE INDEX IF NOT EXISTS idx_roads_from ON roads(city_from_id);
CREATE INDEX IF NOT EXISTS idx_roads_to ON roads(city_to_id);

INSERT INTO cities (name, lat, lng, region) VALUES
('Київ', 50.4501, 30.5234, 'Київська'),
('Харків', 50.0028, 36.2360, 'Харківська'),
('Одеса', 46.4858, 30.7326, 'Одеська'),
('Львів', 49.8397, 24.0297, 'Львівська'),
('Дніпро', 48.4647, 35.0468, 'Дніпропетровська'),
('Запоріжжя', 47.8388, 35.1395, 'Запорізька'),
('Кривий Ріг', 47.9093, 33.3807, 'Дніпропетровська'),
('Полтава', 49.5883, 34.5514, 'Полтавська'),
('Ужгород', 48.6208, 22.2879, 'Закарпатська'),
('Чернівці', 48.2912, 25.9424, 'Чернівецька'),
('Вінниця', 49.2331, 28.4682, 'Вінницька'),
('Суми', 50.9216, 34.7988, 'Сумська'),
('Миколаїв', 46.9750, 32.0006, 'Миколаївська'),
('Кам''янське', 48.5152, 34.5589, 'Дніпропетровська'),
('Житомир', 50.2547, 28.6587, 'Житомирська'),
('Черкаси', 49.4444, 32.0598, 'Черкаська'),
('Чернігів', 51.4982, 31.2893, 'Чернігівська'),
('Тернопіль', 49.5535, 25.5948, 'Тернопільська'),
('Івано-Франківськ', 48.9226, 24.7111, 'Івано-Франківська'),
('Луцьк', 50.7472, 25.3254, 'Волинська'),
('Рівне', 50.6199, 26.2516, 'Рівненська'),
('Хмельницький', 49.4229, 26.9871, 'Хмельницька'),
('Кропивницький', 48.5079, 32.2623, 'Кіровоградська'),
('Кременчук', 49.0661, 33.4179, 'Полтавська'),
('Біла Церква', 49.7980, 30.1152, 'Київська')
ON CONFLICT (name) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region;

WITH edges (from_city, to_city, distance_km, driving_time_minutes) AS (
  VALUES
  -- Core
  ('Київ','Харків',430,390), ('Київ','Львів',540,480), ('Київ','Одеса',450,420),
  ('Київ','Дніпро',480,420), ('Київ','Полтава',160,150), ('Київ','Вінниця',200,180),
  ('Київ','Суми',320,300), ('Київ','Житомир',140,120), ('Київ','Чернігів',150,130),
  ('Київ','Черкаси',190,170), ('Київ','Біла Церква',85,75),

  -- East / center
  ('Харків','Дніпро',280,240), ('Харків','Суми',180,150), ('Харків','Полтава',130,120),
  ('Полтава','Кременчук',115,100), ('Черкаси','Кременчук',115,100),
  ('Черкаси','Кропивницький',130,120), ('Кременчук','Дніпро',170,150),
  ('Кропивницький','Кривий Ріг',120,110),

  -- South
  ('Дніпро','Запоріжжя',90,85), ('Дніпро','Кривий Ріг',160,140),
  ('Дніпро','Кам''янське',50,45), ('Дніпро','Одеса',450,420),
  ('Запоріжжя','Миколаїв',280,240), ('Запоріжжя','Одеса',280,240),
  ('Одеса','Миколаїв',120,100), ('Кривий Ріг','Запоріжжя',200,180),
  ('Кривий Ріг','Миколаїв',180,160),

  -- Crucial direct roads to avoid Kyiv detours
  ('Вінниця','Одеса',420,360), ('Вінниця','Миколаїв',360,320), ('Вінниця','Черкаси',260,230),
  ('Вінниця','Кропивницький',290,260), ('Вінниця','Хмельницький',120,105),
  ('Житомир','Вінниця',130,115), ('Житомир','Рівне',190,170),

  -- West
  ('Львів','Ужгород',240,220), ('Львів','Чернівці',280,260), ('Львів','Вінниця',340,300),
  ('Львів','Тернопіль',130,115), ('Львів','Івано-Франківськ',140,130),
  ('Львів','Луцьк',150,130), ('Луцьк','Рівне',75,65),
  ('Рівне','Тернопіль',160,145), ('Тернопіль','Хмельницький',110,95),
  ('Івано-Франківськ','Чернівці',130,120), ('Ужгород','Чернівці',280,250),
  ('Чернівці','Вінниця',260,230), ('Хмельницький','Вінниця',120,105)
),
resolved AS (
  SELECT
    c_from.id AS city_from_id,
    c_to.id AS city_to_id,
    e.distance_km,
    e.driving_time_minutes
  FROM edges e
  JOIN cities c_from ON c_from.name = e.from_city
  JOIN cities c_to ON c_to.name = e.to_city
),
bidirectional AS (
  SELECT city_from_id, city_to_id, distance_km, driving_time_minutes FROM resolved
  UNION ALL
  SELECT city_to_id, city_from_id, distance_km, driving_time_minutes FROM resolved
),
deduplicated AS (
  SELECT
    city_from_id,
    city_to_id,
    MIN(distance_km) AS distance_km,
    MIN(driving_time_minutes) AS driving_time_minutes
  FROM bidirectional
  GROUP BY city_from_id, city_to_id
)
INSERT INTO roads (city_from_id, city_to_id, distance_km, driving_time_minutes)
SELECT city_from_id, city_to_id, distance_km, driving_time_minutes
FROM deduplicated
ON CONFLICT (city_from_id, city_to_id) DO UPDATE SET
  distance_km = EXCLUDED.distance_km,
  driving_time_minutes = EXCLUDED.driving_time_minutes;
