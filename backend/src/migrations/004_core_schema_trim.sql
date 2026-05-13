-- Core schema trim: remove social, messaging, multi-user, experiments, and users.
-- Run once: npm run migrate:core  (or: node backend/scripts/apply-core-trim.js)

DROP TABLE IF EXISTS productivity_reports CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;

DROP TABLE IF EXISTS uz_rail_segments CASCADE;
DROP TABLE IF EXISTS uz_rail_stations CASCADE;

DROP TABLE IF EXISTS users CASCADE;

ALTER TABLE sessions DROP COLUMN IF EXISTS max_participants;
