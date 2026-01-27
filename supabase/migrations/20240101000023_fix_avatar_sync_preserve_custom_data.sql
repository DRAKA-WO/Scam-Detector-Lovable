-- Fix sync_user_from_auth trigger to preserve custom avatars and names
-- The trigger should NOT overwrite custom data in public.users with Google OAuth data
-- Custom avatars/names in public.users should be preserved and take priority

-- Replace the sync function to preserve custom data
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- For new users: Insert with data from auth
  -- For existing users: Only update if public.users field is NULL (preserve custom data)
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
    -- Only update email if it's NULL (preserve existing)
    email = COALESCE(public.users.email, EXCLUDED.email),
    -- Only update full_name if it's NULL (preserve custom names)
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    -- Only update avatar_url if it's NULL (preserve custom avatars)
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = CASE 
      WHEN public.users.email IS NULL OR 
           public.users.full_name IS NULL OR 
           public.users.avatar_url IS NULL 
      THEN NOW() 
      ELSE public.users.updated_at 
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the comment
COMMENT ON FUNCTION public.sync_user_from_auth() IS 'Syncs email, full_name, and avatar_url from auth.users to public.users, but preserves custom data in public.users (only updates NULL values)';
