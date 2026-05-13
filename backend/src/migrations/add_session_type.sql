-- Add session_type column to sessions table
-- This allows differentiating between:
-- 'public' = scheduled sessions following a timetable
-- 'private' = on-demand single sessions

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'public';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type);

-- Update existing sessions to be 'public' by default (already set via DEFAULT)
UPDATE sessions SET session_type = 'public' WHERE session_type IS NULL;
