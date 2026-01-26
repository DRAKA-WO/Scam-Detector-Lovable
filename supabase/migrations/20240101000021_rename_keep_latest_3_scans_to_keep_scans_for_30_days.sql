-- Rename function from keep_latest_3_scans() to keep_scans_for_30_days()
-- This makes the function name match its actual behavior (30 days, not 3 scans)
-- The old function name was misleading and caused confusion
-- 
-- SAFE TO RUN: This only affects the database trigger function name.
-- No application code calls this function directly - only the trigger does.

-- Step 1: Create the new function with the correct, descriptive name
CREATE OR REPLACE FUNCTION keep_scans_for_30_days()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL: This function keeps ALL scans within the last 30 days
  -- DO NOT change this to limit by count - it must keep scans for 30 days!
  -- This is a data retention policy, not a count limit.
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update the trigger to use the new function name
-- The trigger is the only thing that calls this function, so updating it is safe
DROP TRIGGER IF EXISTS cleanup_old_scans ON public.scan_history;
CREATE TRIGGER cleanup_old_scans
  AFTER INSERT ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION keep_scans_for_30_days();

-- Step 3: Keep old function name as a wrapper for backwards compatibility
-- This ensures old migrations that reference keep_latest_3_scans() still work
-- The wrapper just calls the new function, so behavior is identical
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- DEPRECATED: This function name is misleading - it actually keeps scans for 30 days!
  -- This wrapper is kept only for backwards compatibility with old migrations.
  -- The trigger now uses keep_scans_for_30_days() directly.
  -- All new code should use keep_scans_for_30_days() instead.
  RETURN keep_scans_for_30_days();
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add clear documentation to prevent future mistakes
COMMENT ON FUNCTION keep_scans_for_30_days() IS 
  'Keeps ALL scans within the last 30 days for each user. Deletes only scans older than 30 days. DO NOT change to limit by count. This is a data retention policy.';

COMMENT ON FUNCTION keep_latest_3_scans() IS 
  'DEPRECATED: Misleading name. Actually keeps scans for 30 days, not 3 scans. This is a wrapper that calls keep_scans_for_30_days(). Kept for backwards compatibility with old migrations. Use keep_scans_for_30_days() instead.';

-- Verification query (optional - run manually to verify):
-- SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'cleanup_old_scans';
