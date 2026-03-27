-- Add forwarded_at column to track which emails have been forwarded to Morris
ALTER TABLE emails ADD COLUMN IF NOT EXISTS forwarded_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_emails_forwarded_at ON emails (forwarded_at);
