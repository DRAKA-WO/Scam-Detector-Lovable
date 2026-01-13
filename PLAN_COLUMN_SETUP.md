# Adding Plan Column to Users Table - Instructions

## Step 1: Run the Migration in Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20240101000002_add_plan_to_users.sql`
5. Click **Run** to execute the migration
6. Verify the migration succeeded (you should see a success message)

### Option B: Using Supabase CLI (If you have it set up)

```bash
cd "C:\Users\DRAKA\Desktop\Scam-Detector-Lovable"
supabase db push
```

## Step 2: Verify the Column Was Added

1. In Supabase Dashboard, go to **Table Editor**
2. Find the `users` table (in the `public` schema)
3. Verify you see a `plan` column with:
   - Type: `text`
   - Default: `FREE`
   - Constraints: CHECK (plan IN ('FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'))

## Step 3: Test the Integration

1. The code is already updated to fetch the plan from the `users` table
2. When a user logs in, the extension will automatically fetch their plan
3. The plan will sync to the extension popup in real-time

## Step 4: Update User Plans (Optional)

To update a user's plan, you can:

### Via Supabase Dashboard:
1. Go to **Table Editor** → `users` table
2. Find the user's row
3. Edit the `plan` column value (FREE, PRO, PREMIUM, or ENTERPRISE)
4. Save

### Via SQL:
```sql
UPDATE public.users 
SET plan = 'PRO' 
WHERE id = 'user-uuid-here';
```

### Via Code (Future):
You can add an admin function to update plans programmatically.

## Notes

- All existing users will automatically have `plan = 'FREE'` set
- New users will default to `FREE` plan
- The extension will show the correct plan after the migration is run
- The plan syncs automatically when users log in or when checks are updated

## Troubleshooting

If you get errors:
1. Make sure the `users` table exists (the migration will create it if it doesn't)
2. Check that RLS policies allow authenticated users to read their own plan
3. Verify the plan value matches one of: 'FREE', 'PRO', 'PREMIUM', 'ENTERPRISE'
