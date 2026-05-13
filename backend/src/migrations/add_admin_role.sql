-- Add role column to users table
-- This allows differentiating between regular users and admins

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- To promote a user to admin, run:
-- UPDATE users SET role = 'admin' WHERE username = 'admin_username';
