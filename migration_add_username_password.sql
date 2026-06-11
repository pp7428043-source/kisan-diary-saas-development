-- Migration: Add username and passwordHash columns to users table
-- Run this SQL against your PostgreSQL database (app_db)
-- Command: psql -U postgres -d app_db -f migration_add_username_password.sql

-- 1. Make phone nullable (existing users keep their phone; new username-based users won't need it)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- 2. Add username column (unique, nullable — existing phone-based users won't have one)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- 3. Add password_hash column (nullable — existing OTP users won't have one)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
