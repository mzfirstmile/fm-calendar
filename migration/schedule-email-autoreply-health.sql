-- ── Schedule email-autoreply-health edge function via pg_cron ─────────
-- Runs once per hour (at :00). Previous Cowork-scheduled task ran every 5
-- minutes and spawned a browser tab group on each run; moving to Supabase
-- pg_cron eliminates that and lets us run at a saner frequency.
--
-- Uses the same `app.settings.service_role_key` GUC pattern as the existing
-- sync-ai-inbox and task-reminders cron jobs — no need to paste the raw key.

SELECT cron.schedule(
  'email-autoreply-health',
  '0 * * * *',   -- every hour at :00
  $$
  SELECT net.http_post(
    url := 'https://qrtleqasnhbnruodlgpt.supabase.co/functions/v1/email-autoreply-health',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To unschedule later if needed:
--   SELECT cron.unschedule('email-autoreply-health');

-- To change frequency:
--   SELECT cron.alter_job(
--     (SELECT jobid FROM cron.job WHERE jobname = 'email-autoreply-health'),
--     schedule := '0 */4 * * *'  -- every 4 hours at :00
--   );
