-- Add module access columns to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_calendar BOOLEAN DEFAULT TRUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_financials BOOLEAN DEFAULT TRUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_forecasting BOOLEAN DEFAULT TRUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_exec BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_properties BOOLEAN DEFAULT TRUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS access_users BOOLEAN DEFAULT FALSE;

-- Give admin (Morris) access to everything
UPDATE app_users SET access_calendar = TRUE, access_financials = TRUE, access_forecasting = TRUE, access_exec = TRUE, access_properties = TRUE, access_users = TRUE WHERE email = 'mz@firstmilecap.com';
