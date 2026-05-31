-- ============================================================
-- ADD INVITE_CODE COLUMN TO CLIENTS TABLE
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add invite_code column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS invite_code text;

-- Create unique index for invite codes (for lookups during signup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_invite_code 
ON clients(invite_code) 
WHERE invite_code IS NOT NULL;

-- Generate invite codes for existing clients that don't have one
UPDATE clients 
SET invite_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
WHERE invite_code IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients.invite_code IS 'Unique 6-character alphanumeric code for client signup invitation';
