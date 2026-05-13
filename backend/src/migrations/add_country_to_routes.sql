-- Add country column to routes table if it doesn't exist
ALTER TABLE routes ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Ukraine';
