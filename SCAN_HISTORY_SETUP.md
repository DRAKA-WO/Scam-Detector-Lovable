# Scan History Setup Guide

This guide will help you set up the scan history feature that stores the latest 3 scans with images for all users.

## Prerequisites

- Supabase project set up
- Supabase client configured in your frontend
- User authentication working

## Step 1: Run Database Migrations

You need to run the SQL migrations in your Supabase dashboard:

### Migration 1: Create scan_history table

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Create scan_history table
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('image', 'url', 'text')),
  content_preview TEXT, -- First 200 chars for text/URL preview
  image_url TEXT, -- Supabase Storage URL (if image)
  classification TEXT NOT NULL CHECK (classification IN ('safe', 'suspicious', 'scam')),
  analysis_result JSONB NOT NULL, -- Store full analysis result
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user queries (ordered by created_at DESC for latest first)
CREATE INDEX IF NOT EXISTS idx_scan_history_user_created ON scan_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own scans
CREATE POLICY "Users can view their own scans"
ON scan_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own scans
CREATE POLICY "Users can insert their own scans"
ON scan_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own scans
CREATE POLICY "Users can delete their own scans"
ON scan_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to automatically keep only latest 3 scans per user
CREATE OR REPLACE FUNCTION keep_latest_3_scans()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete scans beyond the 3rd most recent for this user
  DELETE FROM scan_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM scan_history
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after each insert
CREATE TRIGGER cleanup_old_scans
AFTER INSERT ON scan_history
FOR EACH ROW
EXECUTE FUNCTION keep_latest_3_scans();
```

### Migration 2: Create Storage Bucket

Go to your Supabase Dashboard → Storage and create a new bucket, OR run this SQL:

```sql
-- Create storage bucket for scan images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scan-images',
  'scan-images',
  false, -- Private bucket (users can only access their own images)
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own images
CREATE POLICY "Users can upload their own scan images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scan-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own images
CREATE POLICY "Users can view their own scan images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scan-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own scan images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scan-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Alternative: Create bucket via Supabase Dashboard**

1. Go to Storage → New bucket
2. Name: `scan-images`
3. Public: **No** (unchecked)
4. File size limit: 10MB
5. Allowed MIME types: `image/png, image/jpeg, image/jpg, image/gif, image/webp`
6. Then run the policies SQL above

## Step 2: Verify Setup

1. **Check table exists:**
   ```sql
   SELECT * FROM scan_history LIMIT 1;
   ```

2. **Check bucket exists:**
   - Go to Storage → You should see `scan-images` bucket

3. **Test RLS policies:**
   - Try querying scan_history as an authenticated user
   - Should only see your own scans

## Step 3: Test the Feature

1. **Login to your app**
2. **Perform a scan** (image, URL, or text)
3. **Go to Dashboard**
4. **Click "View Scan History"**
5. **Verify:**
   - Latest 3 scans appear
   - Images display correctly (for image scans)
   - Clicking a scan shows full analysis result
   - Older scans are automatically deleted (only 3 kept)

## How It Works

### Automatic Cleanup

The database trigger `keep_latest_3_scans()` automatically:
- Runs after each new scan is inserted
- Deletes all scans beyond the 3 most recent for that user
- Keeps storage costs minimal

### Storage Structure

- Images are stored in: `scan-images/{userId}/{timestamp}.{ext}`
- Each user can only access their own folder
- Images are automatically deleted when scans are removed

### Cost Efficiency

- **Per user:** Maximum 3 scans × ~500KB = ~1.5MB
- **1000 users:** ~1.5GB (well within free tier)
- **5000 users:** ~7.5GB (Pro tier: $25/month)

## Troubleshooting

### "Table doesn't exist" error
- Run the migration SQL in Supabase SQL Editor
- Check that migrations ran successfully

### "Bucket doesn't exist" error
- Create the bucket manually in Storage dashboard
- Or run the storage bucket SQL

### Images not displaying / Damaged preview
- **Most common issue:** The bucket is private, so images need signed URLs
- The code now automatically generates signed URLs when displaying images
- Check browser console for errors
- Verify storage policies allow SELECT on storage.objects
- Make sure the image path is stored correctly in the database (should be like `userId/timestamp.ext`, not a full URL)
- If images still don't show:
  1. Check browser console for storage errors
  2. Verify the bucket exists and policies are set
  3. Try refreshing the history page

### History not saving
- Check browser console for errors
- Verify user is authenticated
- Check Supabase logs for RLS policy violations

### Too many scans (more than 3)
- Check that the trigger is created
- Verify trigger function exists: `SELECT * FROM pg_trigger WHERE tgname = 'cleanup_old_scans';`
- Manually run cleanup if needed:
  ```sql
  DELETE FROM scan_history
  WHERE user_id = 'your-user-id'
    AND id NOT IN (
      SELECT id FROM scan_history
      WHERE user_id = 'your-user-id'
      ORDER BY created_at DESC
      LIMIT 3
    );
  ```

## Files Created

- `src/utils/scanHistory.js` - Utility functions for saving/retrieving scans
- `src/components/ScanHistory.jsx` - Component to display scan history
- `supabase/migrations/20240101000000_create_scan_history.sql` - Database migration
- `supabase/migrations/20240101000001_create_storage_bucket.sql` - Storage bucket migration

## Next Steps

- ✅ History feature is now active
- ✅ Scans are automatically saved after analysis
- ✅ Users can view their latest 3 scans in Dashboard
- ✅ Old scans are automatically cleaned up

Enjoy your new scan history feature! 🎉
