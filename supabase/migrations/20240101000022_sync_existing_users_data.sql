-- Sync existing users' email, full_name, and avatar_url from auth.users to public.users
-- This fixes NULL values in public.users for users that were created before the sync trigger

DO $$ 
BEGIN
  -- Sync email, full_name, and avatar_url from auth.users to public.users
  -- For all existing users that have NULL values
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

-- Ensure the sync trigger exists for future users
-- Check if sync_user_from_auth function exists, if not create it
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
    COALESCE((SELECT plan FROM public.users WHERE id = NEW.id), 'FREE'),
    COALESCE(NEW.created_at, NOW()),
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

-- Ensure triggers exist for future user creation/updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_from_auth();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_user_from_auth();

COMMENT ON FUNCTION public.sync_user_from_auth() IS 'Syncs email, full_name, and avatar_url from auth.users to public.users on insert/update';
