-- Add full_name and avatar_url columns to users table if they don't exist
-- Also ensure RLS policies allow users to update their own profile

DO $$ 
BEGIN
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN full_name TEXT;
    COMMENT ON COLUMN public.users.full_name IS 'User full name or display name';
  END IF;

  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    COMMENT ON COLUMN public.users.avatar_url IS 'URL to user avatar image';
  END IF;

  -- Ensure RLS is enabled
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  -- Drop existing update policy if it exists (to recreate with full permissions)
  DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
  
  -- Create/Recreate policy: Users can update their own record (including full_name and avatar_url)
  CREATE POLICY "Users can update their own record"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

  RAISE NOTICE 'Profile fields (full_name, avatar_url) and RLS policies configured';
END $$;