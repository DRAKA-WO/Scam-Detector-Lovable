-- Rollback: Remove auto-sync trigger for email users
-- This migration removes the trigger and function that automatically syncs auth.users to public.users
-- Run this if you want to disable automatic user syncing

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add comment to document the rollback
COMMENT ON SCHEMA public IS 'Auto-sync trigger removed - users must be manually created in public.users table';
