-- Create user_stats table if it doesn't exist
-- This migration should be run BEFORE 20240101000007_add_insights_to_user_stats.sql
-- If you already have user_stats table, you can skip this migration

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_scans INTEGER DEFAULT 0,
  scams_detected INTEGER DEFAULT 0,
  safe_results INTEGER DEFAULT 0,
  suspicious_results INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_stats' 
    AND policyname = 'Users can view their own stats'
  ) THEN
    CREATE POLICY "Users can view their own stats"
    ON user_stats FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can insert their own stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_stats' 
    AND policyname = 'Users can insert their own stats'
  ) THEN
    CREATE POLICY "Users can insert their own stats"
    ON user_stats FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can update their own stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_stats' 
    AND policyname = 'Users can update their own stats'
  ) THEN
    CREATE POLICY "Users can update their own stats"
    ON user_stats FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;
