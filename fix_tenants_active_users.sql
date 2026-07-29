-- Supabase SQL Migration: Fix Tenants Active Users Column
-- Adds the missing 'active_users' column to the 'tenants' table to prevent PGRST204 warnings.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_users integer DEFAULT 0;

-- Optional: Refresh schema cache
NOTIFY pgrst, 'reload schema';
