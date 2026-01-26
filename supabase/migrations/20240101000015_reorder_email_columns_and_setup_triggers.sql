-- Reorder email columns to be first and setup triggers/functions
-- This migration assumes email columns already exist from the previous migration

-- Step 1: Reorder user_stats table to have email as first column
DO $$
DECLARE
  email_is_first BOOLEAN := FALSE;
BEGIN
  -- Check if email column exists and if it's already first
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_stats' 
    AND column_name = 'email'
    AND ordinal_position = 1
  ) INTO email_is_first;

  -- Only recreate table if email exists but is not first
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_stats' 
    AND column_name = 'email'
  ) AND NOT email_is_first THEN
    -- Create new table with email first
    CREATE TABLE IF NOT EXISTS public.user_stats_new (
      email TEXT,
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      total_scans INTEGER DEFAULT 0,
      scams_detected INTEGER DEFAULT 0,
      safe_results INTEGER DEFAULT 0,
      suspicious_results INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Copy data from old table to new table
    INSERT INTO public.user_stats_new (email, user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at)
    SELECT email, user_id, total_scans, scams_detected, safe_results, suspicious_results, created_at, updated_at
    FROM public.user_stats;

    -- Drop old table
    DROP TABLE IF EXISTS public.user_stats CASCADE;

    -- Rename new table to original name
    ALTER TABLE public.user_stats_new RENAME TO user_stats;

    -- Re-enable RLS
    ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

    -- Recreate RLS policies
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
  END IF;
END $$;

-- Step 2: Reorder scan_history table to have email as first column
DO $$
DECLARE
  email_is_first BOOLEAN := FALSE;
BEGIN
  -- Check if email column exists and if it's already first
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scan_history' 
    AND column_name = 'email'
    AND ordinal_position = 1
  ) INTO email_is_first;

  -- Only recreate table if email exists but is not first
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'scan_history' 
    AND column_name = 'email'
  ) AND NOT email_is_first THEN
    -- Create new table with email first
    CREATE TABLE IF NOT EXISTS public.scan_history_new (
      email TEXT,
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      scan_type TEXT NOT NULL CHECK (scan_type IN ('image', 'url', 'text')),
      content_preview TEXT,
      image_url TEXT,
      classification TEXT NOT NULL CHECK (classification IN ('safe', 'suspicious', 'scam')),
      analysis_result JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Copy data from old table to new table
    INSERT INTO public.scan_history_new (email, id, user_id, scan_type, content_preview, image_url, classification, analysis_result, created_at)
    SELECT email, id, user_id, scan_type, content_preview, image_url, classification, analysis_result, created_at
    FROM public.scan_history;

    -- Drop old table (CASCADE to drop dependent objects)
    DROP TABLE IF EXISTS public.scan_history CASCADE;

    -- Rename new table to original name
    ALTER TABLE public.scan_history_new RENAME TO scan_history;

    -- Recreate index
    CREATE INDEX IF NOT EXISTS idx_scan_history_user_created ON scan_history(user_id, created_at DESC);

    -- Re-enable RLS
    ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

    -- Recreate RLS policies
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'scan_history' 
      AND policyname = 'Users can view their own scans'
    ) THEN
      CREATE POLICY "Users can view their own scans"
      ON scan_history FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'scan_history' 
      AND policyname = 'Users can insert their own scans'
    ) THEN
      CREATE POLICY "Users can insert their own scans"
      ON scan_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'scan_history' 
      AND policyname = 'Users can delete their own scans'
    ) THEN
      CREATE POLICY "Users can delete their own scans"
      ON scan_history FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- Step 3: Recreate trigger function for keeping scans for 30 days (outside DO block)
-- IMPORTANT: This function keeps scans for 30 days, NOT just 3 scans!
-- The name "keep_latest_3_scans" is kept for backwards compatibility only.
-- DO NOT change this to limit by count - it must keep scans for 30 days!
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete scans older than 30 days for this user
  -- CRITICAL: This preserves ALL scans within the last 30 days, not a fixed count
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate trigger for cleanup_old_scans
DROP TRIGGER IF EXISTS cleanup_old_scans ON public.scan_history;
CREATE TRIGGER cleanup_old_scans
  AFTER INSERT ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION keep_latest_3_scans();

-- Step 5: Function to update email in user_stats when user is created/updated
CREATE OR REPLACE FUNCTION public.sync_user_stats_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in user_stats when auth.users email changes
  UPDATE public.user_stats
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Function to update email in scan_history when user is created/updated
CREATE OR REPLACE FUNCTION public.sync_scan_history_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in scan_history when auth.users email changes
  UPDATE public.scan_history
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create triggers to sync email when auth.users is updated
DROP TRIGGER IF EXISTS sync_user_stats_email_trigger ON auth.users;
CREATE TRIGGER sync_user_stats_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_stats_email();

DROP TRIGGER IF EXISTS sync_scan_history_email_trigger ON auth.users;
CREATE TRIGGER sync_scan_history_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_scan_history_email();

-- Step 8: Function to populate email when inserting into user_stats
CREATE OR REPLACE FUNCTION public.set_user_stats_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users or public.users if not provided
  IF NEW.email IS NULL THEN
    NEW.email := COALESCE(
      (SELECT email FROM auth.users WHERE id = NEW.user_id),
      (SELECT email FROM public.users WHERE id = NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Function to populate email when inserting into scan_history
CREATE OR REPLACE FUNCTION public.set_scan_history_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users or public.users if not provided
  IF NEW.email IS NULL THEN
    NEW.email := COALESCE(
      (SELECT email FROM auth.users WHERE id = NEW.user_id),
      (SELECT email FROM public.users WHERE id = NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create triggers to auto-populate email on insert
DROP TRIGGER IF EXISTS set_user_stats_email_trigger ON public.user_stats;
CREATE TRIGGER set_user_stats_email_trigger
  BEFORE INSERT ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_stats_email();

DROP TRIGGER IF EXISTS set_scan_history_email_trigger ON public.scan_history;
CREATE TRIGGER set_scan_history_email_trigger
  BEFORE INSERT ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_scan_history_email();

-- Step 11: Add comments
COMMENT ON FUNCTION public.sync_user_stats_email() IS 'Syncs email from auth.users to user_stats when email changes';
COMMENT ON FUNCTION public.sync_scan_history_email() IS 'Syncs email from auth.users to scan_history when email changes';
COMMENT ON FUNCTION public.set_user_stats_email() IS 'Auto-populates email in user_stats from auth.users or public.users on insert';
COMMENT ON FUNCTION public.set_scan_history_email() IS 'Auto-populates email in scan_history from auth.users or public.users on insert';
