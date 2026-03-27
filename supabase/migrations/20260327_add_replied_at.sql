-- Add replied_at column to track which emails have been auto-replied to
ALTER TABLE emails ADD COLUMN IF NOT EXISTS replied_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_emails_replied_at ON emails (replied_at);
