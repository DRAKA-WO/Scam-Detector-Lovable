-- Update the function to keep scans for 30 days instead of limiting by count
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete scans older than 30 days for this user
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The function name remains the same for backwards compatibility
-- The trigger will continue to work, but now deletes by date instead of count

-- One-time cleanup: Delete all scans older than 30 days (optional)
DELETE FROM scan_history
WHERE created_at < NOW() - INTERVAL '30 days';