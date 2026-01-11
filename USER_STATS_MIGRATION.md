# User Stats Migration Guide

## What Changed?

We've implemented **permanent cumulative statistics** that will never decrease, even when old scan history is deleted.

### Old System (Problem):
- Stats were calculated by counting all scans in `scan_history`
- When old scans were deleted (kept only 3 latest), stats would decrease
- User would lose their progress

### New System (Solution):
- Stats are stored in a new `user_stats` table
- Stats are **cumulative and permanent** - they only increase
- When scans are deleted from history, stats remain intact
- User progress is never lost

---

## Database Migration

### Step 1: Run the Migration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20240102000000_create_user_stats.sql`
4. Paste and run the SQL

### Step 2: Verify the Migration

Run this query to check the table was created:

```sql
SELECT * FROM user_stats LIMIT 5;
```

You should see a table with columns:
- `user_id`
- `total_scans`
- `scams_detected`
- `safe_results`
- `suspicious_results`
- `created_at`
- `updated_at`

---

## How It Works

### Automatic Stats Tracking

When a user performs a scan:

1. Scan is saved to `scan_history` table
2. **Trigger automatically fires** (`update_user_stats_on_scan`)
3. Stats are incremented in `user_stats` table:
   - `total_scans` +1
   - Classification-specific counter +1 (scam/safe/suspicious)
4. `updated_at` timestamp is updated

### Stats Never Decrease

- Old scans can be deleted from `scan_history` (only 3 kept)
- `user_stats` table is **never affected by deletions**
- Stats only increase, never decrease
- User progress is permanently tracked

---

## Testing

### Test New User Flow

1. Sign up with a new account
2. Perform your first scan
3. Check dashboard - stats should show `1` in appropriate counter
4. Perform 5 more scans
5. Check dashboard - stats should show `6` total scans
6. Old scans get deleted (only 3 shown in history)
7. **Stats still show `6` total scans** ✅

### Verify Stats Persistence

```sql
-- Check a user's stats
SELECT * FROM user_stats WHERE user_id = 'YOUR_USER_ID';

-- Check their scan history (only 3 latest)
SELECT COUNT(*) FROM scan_history WHERE user_id = 'YOUR_USER_ID';
-- Should return: 3

-- But stats should show total of all scans ever performed
```

---

## Migration for Existing Users

If you have existing users with scan history, you need to initialize their stats:

```sql
-- Initialize stats for all existing users based on their current scan history
INSERT INTO user_stats (user_id, total_scans, scams_detected, safe_results, suspicious_results)
SELECT 
  user_id,
  COUNT(*) as total_scans,
  SUM(CASE WHEN classification = 'scam' THEN 1 ELSE 0 END) as scams_detected,
  SUM(CASE WHEN classification = 'safe' THEN 1 ELSE 0 END) as safe_results,
  SUM(CASE WHEN classification = 'suspicious' THEN 1 ELSE 0 END) as suspicious_results
FROM scan_history
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;
```

⚠️ **Note**: This only initializes based on the 3 scans currently in history. Historical scans that were already deleted cannot be recovered.

---

## Benefits

✅ **Stats only increase, never decrease**
✅ **User progress is permanent**
✅ **No data loss when old scans are cleaned up**
✅ **Better performance** (no need to count all scans on every load)
✅ **Accurate lifetime statistics**

---

## Files Changed

1. **New**: `supabase/migrations/20240102000000_create_user_stats.sql` - Database migration
2. **Modified**: `src/utils/scanHistory.js` - Updated `getUserStatsFromDatabase()` function
3. **New**: `USER_STATS_MIGRATION.md` - This guide

---

## Rollback (if needed)

If you need to revert to the old system:

```sql
-- Drop the new table and trigger
DROP TRIGGER IF EXISTS update_user_stats_on_scan ON scan_history;
DROP FUNCTION IF EXISTS increment_user_stats();
DROP TABLE IF EXISTS user_stats;
```

Then restore the old version of `getUserStatsFromDatabase()` from git history.
