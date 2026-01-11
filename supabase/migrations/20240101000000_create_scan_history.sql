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
