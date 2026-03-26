-- App Users table for Microsoft SSO access control
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  first_login TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow read/write via service key (anon key with RLS policy)
CREATE POLICY "Allow all access via anon key" ON app_users
  FOR ALL USING (true) WITH CHECK (true);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Seed admin user
INSERT INTO app_users (email, display_name, is_admin, is_blocked)
VALUES ('mz@firstmilecap.com', 'Morris Zeitouni', TRUE, FALSE)
ON CONFLICT (email) DO NOTHING;
