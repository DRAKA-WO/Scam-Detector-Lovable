-- Add aggregated insights columns to user_stats table
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS scam_type_counts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS daily_trends JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scan_frequency JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_user_stats_scam_type_counts ON user_stats USING GIN (scam_type_counts);