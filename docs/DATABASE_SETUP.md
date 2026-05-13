# Інструкції з налаштування БД PostgreSQL

## Встановлення PostgreSQL

### Windows
1. Завантажте з [postgresql.org](https://www.postgresql.org/download/windows/)
2. Виконайте інсталятор
3. Запам'ятайте пароль для користувача `postgres`

### macOS (з Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Створення Бази Даних

### 1. Підключіться до PostgreSQL
```bash
psql -U postgres
```

### 2. Створіть базу даних
```sql
CREATE DATABASE transmind;
```

### 3. Підключіться до БД
```sql
\c transmind
```

## Схема Таблиць

### users (Користувачі)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### routes (Маршрути)
```sql
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    transport_type VARCHAR(50), -- 'flight', 'train', 'bus'
    start_city VARCHAR(100),
    end_city VARCHAR(100),
    start_lat DECIMAL(10, 8) NOT NULL,
    start_lng DECIMAL(11, 8) NOT NULL,
    end_lat DECIMAL(10, 8) NOT NULL,
    end_lng DECIMAL(11, 8) NOT NULL,
    duration_minutes INTEGER NOT NULL, -- 25-90 для MVP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### sessions (Сесії подорожей)
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50), -- 'scheduled', 'active', 'completed', 'cancelled'
    max_participants INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### session_participants (Учасники сесій)
```sql
CREATE TABLE session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_number VARCHAR(10),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    status VARCHAR(50), -- 'active', 'completed', 'cancelled'
    UNIQUE(session_id, user_id)
);
```

### productivity_reports (Звіти про продуктивність)
```sql
CREATE TABLE productivity_reports (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100), -- 'coding', 'reading', 'working', 'learning', etc.
    productivity_score INTEGER CHECK (productivity_score >= 1 AND productivity_score <= 5),
    completed_goal BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### chat_messages (Повідомлення чату)
```sql
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Індекси (для продуктивності)

```sql
CREATE INDEX idx_routes_transport_type ON routes(transport_type);
CREATE INDEX idx_sessions_route_id ON sessions(route_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_productivity_reports_user_id ON productivity_reports(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

## Тестові дані (опціонально)

```sql
-- Вставити тестові маршрути
INSERT INTO routes (name, transport_type, start_city, end_city, start_lat, start_lng, end_lat, end_lng, duration_minutes) VALUES
('London to Paris Flight', 'flight', 'London', 'Paris', 51.5074, -0.1278, 48.8566, 2.3522, 60),
('NYC to Boston Train', 'train', 'New York', 'Boston', 40.7128, -74.0060, 42.3601, -71.0589, 45),
('Sydney to Melbourne Flight', 'flight', 'Sydney', 'Melbourne', -33.8688, 151.2093, -37.8136, 144.9631, 90);
```

## Налаштування підключення в Node.js

Файл `backend/src/config/database.js` буде використовувати змінні з `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transmind
DB_USER=postgres
DB_PASSWORD=your_password
```

## Команди для роботи з БД

```bash
# Підключитись до БД
psql -U postgres -d transmind

# Вивести список таблиць
\dt

# Вивести схему таблиці
\d table_name

# Вивести всі користувачи
SELECT * FROM users;

# Видалити базу (обережно!)
DROP DATABASE transmind;
```

## Резервна копія та відновлення

```bash
# Створити резервну копію
pg_dump -U postgres transmind > backup.sql

# Відновити з резервної копії
psql -U postgres -d transmind -f backup.sql
```

---

**Приклад підключення з Python:**

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    database="transmind",
    user="postgres",
    password="password"
)

cur = conn.cursor()
cur.execute("SELECT * FROM users;")
print(cur.fetchall())
cur.close()
conn.close()
```
