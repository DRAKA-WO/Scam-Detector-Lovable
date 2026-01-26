-- Fix user_stats RLS policies
-- This ensures policies exist and are correctly configured after table recreation

-- Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;

-- Ensure RLS is enabled
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Recreate SELECT policy
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Recreate INSERT policy
CREATE POLICY "Users can insert their own stats"
ON public.user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy
CREATE POLICY "Users can update their own stats"
ON public.user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix trigger functions to ensure they have proper permissions
-- The set_user_stats_email function needs to access auth.users and public.users
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS set_user_stats_email_trigger ON public.user_stats;
CREATE TRIGGER set_user_stats_email_trigger
  BEFORE INSERT ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_stats_email();

-- Fix scan_history RLS policies and trigger function
-- Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Users can view their own scans" ON public.scan_history;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.scan_history;
DROP POLICY IF EXISTS "Users can delete their own scans" ON public.scan_history;

-- Ensure RLS is enabled
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Recreate SELECT policy
CREATE POLICY "Users can view their own scans"
ON public.scan_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Recreate INSERT policy
CREATE POLICY "Users can insert their own scans"
ON public.scan_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate DELETE policy
CREATE POLICY "Users can delete their own scans"
ON public.scan_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix trigger function to ensure it has proper permissions
-- The set_scan_history_email function needs to access auth.users and public.users
CREATE OR REPLACE FUNCTION public.set_scan_history_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users or public.users if not provided
  -- Use SECURITY DEFINER to run with elevated permissions
  IF NEW.email IS NULL THEN
    BEGIN
      -- Try auth.users first (most reliable)
      SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
      
      -- If not found in auth.users, try public.users
      IF NEW.email IS NULL THEN
        SELECT email INTO NEW.email FROM public.users WHERE id = NEW.user_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If we can't get email, just leave it NULL - it's not critical
        NEW.email := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_scan_history_email() TO authenticated;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS set_scan_history_email_trigger ON public.scan_history;
CREATE TRIGGER set_scan_history_email_trigger
  BEFORE INSERT ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_scan_history_email();

-- Also fix the user_stats trigger function with same approach
CREATE OR REPLACE FUNCTION public.set_user_stats_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Set email from auth.users or public.users if not provided
  IF NEW.email IS NULL THEN
    BEGIN
      -- Try auth.users first (most reliable)
      SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
      
      -- If not found in auth.users, try public.users
      IF NEW.email IS NULL THEN
        SELECT email INTO NEW.email FROM public.users WHERE id = NEW.user_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If we can't get email, just leave it NULL - it's not critical
        NEW.email := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_stats_email() TO authenticated;
