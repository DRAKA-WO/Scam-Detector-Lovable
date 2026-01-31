-- Add learn_more_data column to scan_history so "Learn more" content is stored
-- on the same scam scan row instead of creating separate learn_more entries.
-- No change to scan_type: only 'image', 'url', 'text' remain valid.

-- Add column (nullable; only scam rows may have it populated)
ALTER TABLE public.scan_history
ADD COLUMN IF NOT EXISTS learn_more_data JSONB DEFAULT NULL;

-- Allow users to update their own scan rows (e.g. to set learn_more_data)
DROP POLICY IF EXISTS "Users can update their own scans" ON public.scan_history;
CREATE POLICY "Users can update their own scans"
ON public.scan_history FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: remove any stray learn_more rows if they were inserted before this fix
-- (Only run if your table had scan_type extended to 'learn_more' elsewhere; this migration does not add it.)
-- DELETE FROM public.scan_history WHERE scan_type = 'learn_more';
