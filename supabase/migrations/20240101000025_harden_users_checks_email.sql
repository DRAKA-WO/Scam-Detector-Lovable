-- Harden public.users for email logins: ensure checks/plan are never NULL.
-- Prevents CORS/520 issues that can occur when existing rows have bad/corrupt data
-- (e.g. NULL checks). Only affects email users in some setups; this makes all users safe.

-- 1) Ensure checks column exists and has default for new rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'checks'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN checks integer NOT NULL DEFAULT 5;
    COMMENT ON COLUMN public.users.checks IS 'Remaining scan checks; new signups get 5';
    RAISE NOTICE 'Added checks column with DEFAULT 5';
  END IF;
END $$;

-- 2) If checks exists but is nullable, backfill NULLs then set NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'checks'
  ) THEN
    UPDATE public.users SET checks = 5 WHERE checks IS NULL;
    IF FOUND THEN
      RAISE NOTICE 'Backfilled NULL checks to 5';
    END IF;
    BEGIN
      ALTER TABLE public.users ALTER COLUMN checks SET DEFAULT 5;
      ALTER TABLE public.users ALTER COLUMN checks SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- Column might already be NOT NULL
      NULL;
    END;
  END IF;
END $$;

-- 3) Backfill NULL plan (should not happen, but safe)
UPDATE public.users SET plan = 'FREE' WHERE plan IS NULL;

-- 4) Sync trigger: set checks explicitly on INSERT so new email/OAuth users always get 5
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, plan, checks, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE((SELECT plan FROM public.users WHERE id = NEW.id), 'FREE'),
    COALESCE((SELECT checks FROM public.users WHERE id = NEW.id), 5),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.users.email, EXCLUDED.email),
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
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

COMMENT ON FUNCTION public.sync_user_from_auth() IS 'Syncs auth.users to public.users; preserves custom data; ensures checks/plan for email and OAuth users';
