-- Rename function to reflect actual behavior and add safeguards
-- This prevents future mistakes where someone might think it keeps only 3 scans

-- Step 1: Create new function with descriptive name
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

-- Step 2: Update trigger to use new function name
DROP TRIGGER IF EXISTS cleanup_old_scans ON public.scan_history;
CREATE TRIGGER cleanup_old_scans
  AFTER INSERT ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION keep_scans_for_30_days();

-- Step 3: Keep old function name as an alias for backwards compatibility
-- But make it call the new function to prevent confusion
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- WARNING: This function name is misleading - it actually keeps scans for 30 days!
  -- This is kept only for backwards compatibility.
  -- Use keep_scans_for_30_days() instead.
  RETURN keep_scans_for_30_days();
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add comment to document the actual behavior
COMMENT ON FUNCTION keep_scans_for_30_days() IS 
  'Keeps ALL scans within the last 30 days for each user. Deletes only scans older than 30 days. DO NOT change to limit by count.';

COMMENT ON FUNCTION keep_latest_3_scans() IS 
  'DEPRECATED: Misleading name. Actually keeps scans for 30 days, not 3 scans. Use keep_scans_for_30_days() instead. Kept for backwards compatibility only.';
