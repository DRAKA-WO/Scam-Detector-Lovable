-- Ensure current auth user exists in public.users (backfill if trigger missed).
-- Call this from the app when loading the dashboard so email-confirmed users
-- who weren't synced by on_auth_user_created still get a public.users row.

CREATE OR REPLACE FUNCTION public.ensure_public_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.users (id, email, full_name, avatar_url, plan, checks, created_at, updated_at)
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
    COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
    COALESCE((SELECT plan FROM public.users WHERE id = au.id), 'FREE'),
    COALESCE((SELECT checks FROM public.users WHERE id = au.id), 5),
    COALESCE(au.created_at, NOW()),
    NOW()
  FROM auth.users au
  WHERE au.id = uid
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.users.email, EXCLUDED.email),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = CASE
      WHEN public.users.email IS NULL OR public.users.full_name IS NULL OR public.users.avatar_url IS NULL
      THEN NOW()
      ELSE public.users.updated_at
    END;
END;
$$;

COMMENT ON FUNCTION public.ensure_public_user() IS 'Ensures the current auth user has a row in public.users; call from dashboard load to fix missed trigger sync (e.g. email confirmation flow).';
