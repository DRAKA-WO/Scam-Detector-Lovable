-- Limit content_preview to prevent timeout issues with large text
-- This migration adds a CHECK constraint to limit content_preview to 2000 characters
-- and truncates any existing values that exceed this limit

-- First, truncate any existing content_preview values that exceed 2000 characters
UPDATE scan_history
SET content_preview = LEFT(content_preview, 2000)
WHERE content_preview IS NOT NULL 
  AND LENGTH(content_preview) > 2000;

-- Drop existing constraint if it exists
ALTER TABLE scan_history 
DROP CONSTRAINT IF EXISTS check_content_preview_length;

-- Add CHECK constraint to limit content_preview to 2000 characters
ALTER TABLE scan_history
ADD CONSTRAINT check_content_preview_length 
CHECK (content_preview IS NULL OR LENGTH(content_preview) <= 2000);

-- Add comment to document the limit
COMMENT ON COLUMN scan_history.content_preview IS 'Preview text for URL/text scans (max 2000 characters)';
