-- CRITICAL FIX: Restore 30-day scan retention
-- Migration 20240101000015 accidentally reverted this to 3 scans
-- This migration fixes it immediately to prevent data loss

-- Update function to keep scans for 30 days (NOT 3 scans!)
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL: This keeps ALL scans within the last 30 days, NOT just 3 scans!
  -- The function name is misleading but kept for backwards compatibility.
  -- DO NOT change this to limit by count - it must keep scans for 30 days!
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add explicit comment to prevent future mistakes
COMMENT ON FUNCTION keep_latest_3_scans() IS 
  'CRITICAL: Keeps ALL scans within the last 30 days, NOT 3 scans! Function name is misleading but kept for backwards compatibility. DO NOT change to limit by count.';
