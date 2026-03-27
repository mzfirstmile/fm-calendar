-- Expose pg_cron management via PostgREST RPC calls
-- These functions let the admin UI list, pause, resume, and update cron jobs

-- List all cron jobs
CREATE OR REPLACE FUNCTION public.list_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  nodename text,
  active boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jobid, jobname, schedule, command, nodename, active
  FROM cron.job
  ORDER BY jobid;
$$;

-- Get recent run history for a specific job
CREATE OR REPLACE FUNCTION public.cron_job_history(p_jobid bigint, p_limit int DEFAULT 20)
RETURNS TABLE (
  runid bigint,
  job_pid int,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT runid, job_pid, status, return_message, start_time, end_time
  FROM cron.job_run_details
  WHERE jobid = p_jobid
  ORDER BY start_time DESC
  LIMIT p_limit;
$$;

-- Pause a cron job (set active = false)
CREATE OR REPLACE FUNCTION public.pause_cron_job(p_jobid bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cron.job SET active = false WHERE jobid = p_jobid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Job not found');
  END IF;
  RETURN json_build_object('success', true, 'jobid', p_jobid, 'active', false);
END;
$$;

-- Resume a cron job (set active = true)
CREATE OR REPLACE FUNCTION public.resume_cron_job(p_jobid bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cron.job SET active = true WHERE jobid = p_jobid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Job not found');
  END IF;
  RETURN json_build_object('success', true, 'jobid', p_jobid, 'active', true);
END;
$$;

-- Update cron schedule
CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_jobid bigint, p_schedule text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cron.job SET schedule = p_schedule WHERE jobid = p_jobid;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Job not found');
  END IF;
  RETURN json_build_object('success', true, 'jobid', p_jobid, 'schedule', p_schedule);
END;
$$;

-- Delete a cron job
CREATE OR REPLACE FUNCTION public.delete_cron_job(p_jobid bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jobname text;
BEGIN
  SELECT jobname INTO v_jobname FROM cron.job WHERE jobid = p_jobid;
  IF v_jobname IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Job not found');
  END IF;
  PERFORM cron.unschedule(v_jobname);
  RETURN json_build_object('success', true, 'jobid', p_jobid, 'deleted', v_jobname);
END;
$$;
