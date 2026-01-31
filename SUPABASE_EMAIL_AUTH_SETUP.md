# Supabase setup for email/password auth

Use this checklist so email sign-in and sign-up work and stay in sync with `public.users`. Google OAuth is unchanged.

---

## 1. Auth provider (you already did this)

- **Authentication → Providers → Email**: set to **Enabled**.
- No redirect URL is needed for email/password (redirect URLs are only for OAuth).

---

## 2. Sync trigger (already in your project)

The trigger **`sync_user_from_auth`** on `auth.users` (AFTER INSERT / AFTER UPDATE) creates or updates `public.users` from `auth.users`. It runs for **both** Google OAuth and email sign-ups, so new email users get a row in `public.users` with `email`, `full_name`, `avatar_url`, `plan`, etc.

- Migration: `supabase/migrations/20240101000023_fix_avatar_sync_preserve_custom_data.sql`
- If you ever re-run or fix triggers, ensure this trigger exists and is attached to `auth.users` for INSERT and UPDATE.

---

## 3. `public.users` must have a `checks` column

The app reads `checks` from `public.users` (e.g. in `checkLimits.js`). New users (including email sign-ups) should get a starting number of checks.

**In Supabase Dashboard → SQL Editor**, run this once (safe to run multiple times):

```sql
-- Ensure public.users has a checks column with default for new signups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'checks'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN checks integer NOT NULL DEFAULT 5;
    COMMENT ON COLUMN public.users.checks IS 'Remaining scan checks; new signups get 5';
  END IF;
END $$;
```

If your app uses a different default (e.g. 3), change `DEFAULT 5` to that value. The `sync_user_from_auth` trigger does **not** set `checks`; the default above applies when a new row is inserted (e.g. by the trigger).

---

## 4. Optional: give new users a different starting `checks` in the trigger

If you prefer to set `checks` explicitly in the sync trigger instead of relying on the table default, you can change the trigger to include `checks` in the INSERT. Only do this if you’re comfortable editing the trigger; otherwise the table default above is enough.

---

## 5. Email confirmation (optional)

- **Authentication → Providers → Email → Confirm email**:  
  - If **ON**: users must click the confirmation link before they can sign in; the app shows “Check your email for a confirmation link.”
  - If **OFF**: users can sign in immediately after sign-up.

---

## 6. If something still doesn’t sync

1. **Check the trigger**
   - In Supabase: **Database → Triggers** (or run a query on `pg_trigger` / `information_schema`) and confirm `sync_user_from_auth` exists on `auth.users` for INSERT and UPDATE.

2. **Check `public.users` after sign-up**
   - Sign up with a new email, then in **Table Editor → public.users** find the new user by `id` (same as `auth.users.id`) and confirm `email`, `plan`, and `checks` are set.

3. **RLS**
   - The app uses the same Supabase anon key and RLS as for Google; if Google users can read/update their row, email users should too. If only email fails, check that RLS policies use `auth.uid()` and apply to both OAuth and email users.

4. **Console**
   - In the browser console, filter by `[EMAIL AUTH]` to see email sign-in/sign-up logs and errors.

---

## Quick checklist

- [ ] Email provider enabled (Authentication → Providers → Email).
- [ ] `sync_user_from_auth` trigger present on `auth.users` (INSERT/UPDATE).
- [ ] `public.users` has a `checks` column (add it with the SQL above if missing).
- [ ] (Optional) Confirm email setting matches how you want sign-up to work.

After this, email sign-in/sign-up should create/update `public.users` and the app (including checks) should behave the same as for Google OAuth.

---

## 7. "CORS blocked" + 520 errors after login (was working, then broke)

**What you see:** Email login succeeds (SIGNED_IN, success logs), but then tons of errors:  
`Access to fetch at '...supabase.co/rest/v1/users?...' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header` and `net::ERR_FAILED 520`.

**Cause:** This is almost always **not** a bug in your app. Two common causes:

### A. Project paused (free tier)

Supabase **pauses** free-tier projects after inactivity. When paused:

- Auth might still work (cached or different path).
- **REST API** (e.g. `public.users`) returns 520 / unreachable.
- The failed response has no CORS headers, so the browser reports "CORS blocked."

**Fix:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project (`tpmynhukocnyggqkxckh`).
2. If you see **"Project paused"** or **"Restore project"**, click **Restore project** and wait for the email that restoration is done (can take a few minutes).
3. Hard-refresh your app (Ctrl+Shift+R) and try again.

### B. Allowed origins (if not paused)

If the project is **not** paused and you still get CORS only on REST (not auth):

1. In Dashboard → **Project Settings** → **API** (or **Authentication** → URL Configuration), check for **Redirect URLs** or **Allowed origins**.
2. Ensure `http://localhost:5173` (and your production URL if any) is allowed. Add it if missing and save.
3. For PostgREST CORS, Supabase may use a single allowed list; adding localhost there can fix REST CORS.

Once the project is running and origins are correct, the same code that “was working great” will work again—no reverts needed.

---

## 8. If it happens again (email-only) – deleting users "fixed" it

**What you saw:** CORS/520 errors only with email logins; **deleting all users in Supabase** made it work again. So the issue is tied to **existing user data** (bad or inconsistent rows), not your app code.

**Why it can recur:** Sometimes a row in `public.users` ends up in a bad state (e.g. `checks` or `plan` NULL, or inconsistent data from an old sync). When the app or Supabase REST API hits that row, the request can fail (520) and the browser shows "CORS blocked." Email users are often affected because they're synced from `auth.users` with a slightly different shape (e.g. no `picture` in metadata).

**Softer fix (so you don't have to nuke everyone):**

1. **Run the hardening migration** (if you haven't):  
   Apply `supabase/migrations/20240101000025_harden_users_checks_email.sql`. It backfills NULL `checks`/`plan` and makes the sync trigger set `checks` explicitly for new signups so email users stay consistent.

2. **If it breaks again before/without that migration:**  
   - In **Supabase Dashboard → Table Editor → public.users**, find the **email** user(s) (e.g. sort by `email` or check `auth.users` for provider = `email`).  
   - Delete **only those rows** (or the one that was just created when the error started), then sign up again. You don't have to delete all users.

3. **Optional – find bad rows in SQL Editor:**  
   ```sql
   SELECT id, email, checks, plan FROM public.users WHERE checks IS NULL OR plan IS NULL;
   ```  
   If any rows show up, fix them:  
   ```sql
   UPDATE public.users SET checks = 5, plan = 'FREE' WHERE checks IS NULL OR plan IS NULL;
   ```

**Prevention:** After applying the hardening migration, new email (and OAuth) users get `checks` and `plan` set explicitly by the trigger, and existing NULLs are backfilled once. That should stop this from coming back.
