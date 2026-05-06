-- Adds an "as_of_date" column to rent_roll so the Rent Roll tab can show
-- the period the data was loaded from (parallel to the Balance Sheet tab's
-- "Period: March 2026" label). Yardi rent roll exports include an "As of
-- Date" header that scripts/sync_rent_rolls.py already parses; this column
-- persists that value alongside each row so the UI can label the snapshot.
--
-- Run via the admin SQL Console (admin.firstmilecap.com → SQL Console).

ALTER TABLE rent_roll
  ADD COLUMN IF NOT EXISTS as_of_date DATE;

CREATE INDEX IF NOT EXISTS idx_rent_roll_as_of
  ON rent_roll(property_id, as_of_date);

COMMENT ON COLUMN rent_roll.as_of_date IS
  'Snapshot date the source rent roll was generated for (e.g. 2026-04-30 from a Yardi "As of Date" header).';
