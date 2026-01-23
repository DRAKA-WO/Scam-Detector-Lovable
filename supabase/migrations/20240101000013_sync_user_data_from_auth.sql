-- Sync user data (email, full_name, avatar_url) from auth.users to public.users
-- This migration adds email column if missing and syncs all user data

DO $$ 
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
    COMMENT ON COLUMN public.users.email IS 'User email address synced from auth.users';
  END IF;

  -- Sync email, full_name, and avatar_url from auth.users to public.users
  -- For existing users
  UPDATE public.users pu
  SET 
    email = COALESCE(au.email, pu.email),
    full_name = COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      pu.full_name
    ),
    avatar_url = COALESCE(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture',
      pu.avatar_url
    ),
    updated_at = NOW()
  FROM auth.users au
  WHERE pu.id = au.id
    AND (
      pu.email IS NULL OR
      pu.full_name IS NULL OR
      pu.avatar_url IS NULL OR
      pu.email != au.email OR
      pu.full_name != COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') OR
      pu.avatar_url != COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture')
    );

  RAISE NOTICE 'Synced user data (email, full_name, avatar_url) from auth.users to public.users';
END $$;

-- Create or replace function to sync user data when auth user is created/updated
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update public.users with data from auth.users
  INSERT INTO public.users (id, email, full_name, avatar_url, plan, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'FREE',
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_from_auth();

-- Create trigger for user updates (to sync email/name/avatar changes)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_user_from_auth();

-- Add comment
COMMENT ON FUNCTION public.sync_user_from_auth() IS 'Syncs email, full_name, and avatar_url from auth.users to public.users on insert/update';
