-- Create user_stats table for permanent cumulative statistics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_scans INTEGER DEFAULT 0 NOT NULL,
  scams_detected INTEGER DEFAULT 0 NOT NULL,
  safe_results INTEGER DEFAULT 0 NOT NULL,
  suspicious_results INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own stats
CREATE POLICY "Users can view their own stats"
ON user_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own stats
CREATE POLICY "Users can insert their own stats"
ON user_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own stats
CREATE POLICY "Users can update their own stats"
ON user_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Function to increment user stats when a scan is added
CREATE OR REPLACE FUNCTION increment_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO user_stats (user_id, total_scans, scams_detected, safe_results, suspicious_results)
  VALUES (
    NEW.user_id,
    1,
    CASE WHEN NEW.classification = 'scam' THEN 1 ELSE 0 END,
    CASE WHEN NEW.classification = 'safe' THEN 1 ELSE 0 END,
    CASE WHEN NEW.classification = 'suspicious' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_scans = user_stats.total_scans + 1,
    scams_detected = user_stats.scams_detected + CASE WHEN NEW.classification = 'scam' THEN 1 ELSE 0 END,
    safe_results = user_stats.safe_results + CASE WHEN NEW.classification = 'safe' THEN 1 ELSE 0 END,
    suspicious_results = user_stats.suspicious_results + CASE WHEN NEW.classification = 'suspicious' THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment stats after each scan is inserted
CREATE TRIGGER update_user_stats_on_scan
AFTER INSERT ON scan_history
FOR EACH ROW
EXECUTE FUNCTION increment_user_stats();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
