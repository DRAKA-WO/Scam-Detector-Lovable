-- Update the function to keep latest 10 scans instead of 3
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete scans beyond the 10th most recent for this user
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM scan_history
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger name and function name remain the same for backwards compatibility
-- The function now keeps 10 scans instead of 3
