-- Update cadence constraint to allow Annual and One-Time
ALTER TABLE calendar_tasks DROP CONSTRAINT IF EXISTS calendar_tasks_cadence_check;
ALTER TABLE calendar_tasks ADD CONSTRAINT calendar_tasks_cadence_check CHECK (cadence IN ('Monthly', 'Quarterly', 'Annually', 'Annual', 'One-Time'));

-- Normalize existing 'Annually' rows to 'Annual'
UPDATE calendar_tasks SET cadence = 'Annual' WHERE cadence = 'Annually';
