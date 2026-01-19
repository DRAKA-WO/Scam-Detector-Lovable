-- Fix JSONB columns in user_stats table
-- This migration fixes columns that might have been created incorrectly

-- First, check and drop existing columns if they're wrong type
DO $$
BEGIN
  -- Drop scam_type_counts if it exists and recreate with correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' 
    AND column_name = 'scam_type_counts'
  ) THEN
    -- Check if it's not JSONB type
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'scam_type_counts') != 'jsonb' THEN
      ALTER TABLE user_stats DROP COLUMN scam_type_counts;
      ALTER TABLE user_stats ADD COLUMN scam_type_counts JSONB DEFAULT '{}'::jsonb;
    ELSE
      -- If it's JSONB but has wrong default, fix it
      ALTER TABLE user_stats ALTER COLUMN scam_type_counts SET DEFAULT '{}'::jsonb;
      -- Update any NULL or invalid values to empty object
      UPDATE user_stats 
      SET scam_type_counts = '{}'::jsonb 
      WHERE scam_type_counts IS NULL OR scam_type_counts::text = '0' OR scam_type_counts::text = 'null';
    END IF;
  ELSE
    ALTER TABLE user_stats ADD COLUMN scam_type_counts JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Drop daily_trends if it exists and recreate with correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' 
    AND column_name = 'daily_trends'
  ) THEN
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'daily_trends') != 'jsonb' THEN
      ALTER TABLE user_stats DROP COLUMN daily_trends;
      ALTER TABLE user_stats ADD COLUMN daily_trends JSONB DEFAULT '[]'::jsonb;
    ELSE
      ALTER TABLE user_stats ALTER COLUMN daily_trends SET DEFAULT '[]'::jsonb;
      UPDATE user_stats 
      SET daily_trends = '[]'::jsonb 
      WHERE daily_trends IS NULL OR daily_trends::text = '0' OR daily_trends::text = 'null';
    END IF;
  ELSE
    ALTER TABLE user_stats ADD COLUMN daily_trends JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Drop scan_frequency if it exists and recreate with correct type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' 
    AND column_name = 'scan_frequency'
  ) THEN
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'user_stats' 
        AND column_name = 'scan_frequency') != 'jsonb' THEN
      ALTER TABLE user_stats DROP COLUMN scan_frequency;
      ALTER TABLE user_stats ADD COLUMN scan_frequency JSONB DEFAULT '{}'::jsonb;
    ELSE
      ALTER TABLE user_stats ALTER COLUMN scan_frequency SET DEFAULT '{}'::jsonb;
      UPDATE user_stats 
      SET scan_frequency = '{}'::jsonb 
      WHERE scan_frequency IS NULL OR scan_frequency::text = '0' OR scan_frequency::text = 'null';
    END IF;
  ELSE
    ALTER TABLE user_stats ADD COLUMN scan_frequency JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Recreate index if it doesn't exist
DROP INDEX IF EXISTS idx_user_stats_scam_type_counts;
CREATE INDEX IF NOT EXISTS idx_user_stats_scam_type_counts ON user_stats USING GIN (scam_type_counts);
