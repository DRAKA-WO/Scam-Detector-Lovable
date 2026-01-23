# Scan History & Stats Debug Guide

## Issue: Scans not appearing in stats cards or scan history

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Try scanning the text again
4. Look for these messages:

**✅ Success messages:**
- `📝 saveScanToHistory called with:`
- `📤 Inserting scan to history:`
- `✅ Successfully saved scan to history:`
- `✅ Scan saved to history`

**❌ Error messages to look for:**
- `❌ Error saving scan to history:`
- `❌ Database constraint error`
- `❌ Database constraint violation`
- `❌ Failed to save scan`

### Step 2: Check for Specific Errors

**If you see "constraint" or "check_content_preview_length" error:**
- The migration hasn't been run yet
- Run the migration: `20240101000010_limit_content_preview.sql`
- See migration instructions in previous message

**If you see "Failed to fetch" or "NetworkError":**
- Network connectivity issue
- Check your internet connection
- The scan will be retried automatically

**If you see "PGRST301" or "PGRST302":**
- Supabase connection timeout
- Check Supabase status
- Try again in a few moments

### Step 3: Verify Database

1. Go to Supabase Dashboard → Table Editor → `scan_history`
2. Check if your scan appears there
3. If it's there but not showing in UI:
   - Check the `user_id` matches your current user
   - Check the `created_at` timestamp is recent
   - Check `content_preview` length (should be ≤ 2000 chars)

### Step 4: Check Stats Table

1. Go to Supabase Dashboard → Table Editor → `user_stats`
2. Find your user's row
3. Check if `total_scans` increased
4. Check if the appropriate counter increased (scams_detected, safe_results, or suspicious_results)

### Step 5: Manual Refresh

1. Go to Dashboard page
2. Open Console (F12)
3. Type: `window.dispatchEvent(new Event('scanSaved'))`
4. Press Enter
5. Check if stats refresh

### Step 6: Check localStorage for Failed Scans

1. Open Console (F12)
2. Type: `localStorage.getItem('scam_checker_failed_scans_' + 'YOUR_USER_ID')`
3. Replace `YOUR_USER_ID` with your actual user ID
4. If you see failed scans, they will be retried automatically

### Common Issues & Solutions

**Issue: Migration not run**
- Solution: Run the migration SQL in Supabase Dashboard

**Issue: User not logged in**
- Solution: Make sure you're logged in before scanning

**Issue: Stats not updating**
- Solution: Wait 30 seconds for auto-refresh, or manually refresh the page

**Issue: Scan saved but stats not incrementing**
- Solution: Check `incrementUserStats` function logs in console
- Stats increment is non-blocking, so scan history is more important

### Debug Commands

Run these in browser console:

```javascript
// Check if user is logged in
const { supabase } = await import('@/integrations/supabase/client')
const { data: { session } } = await supabase.auth.getSession()
console.log('User:', session?.user?.id)

// Manually refresh stats
window.dispatchEvent(new Event('scanSaved'))

// Check failed scans
const userId = session?.user?.id
if (userId) {
  const failed = localStorage.getItem(`scam_checker_failed_scans_${userId}`)
  console.log('Failed scans:', failed ? JSON.parse(failed) : 'None')
}

// Check recent scans
const { data } = await supabase
  .from('scan_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5)
console.log('Recent scans:', data)
```
