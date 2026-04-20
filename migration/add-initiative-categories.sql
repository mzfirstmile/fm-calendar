-- ============================================================
-- INITIATIVES: add category + extend status with 'stale'
-- ============================================================
-- Adds a category column to distinguish "Prospective Investment"
-- deals from general (non-deal) initiatives, and adds a new
-- 'stale' status for dead/passed deals.
--
-- Run this via admin.firstmilecap.com → SQL Console
-- ============================================================

-- 1. Add category column
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
    CHECK (category IN ('prospective_investment', 'general'));

CREATE INDEX IF NOT EXISTS idx_initiatives_category ON initiatives (category);

-- 2. Extend status CHECK constraint to include 'stale'
--    Postgres doesn't support "ADD VALUE" on CHECK, so we drop + recreate.
ALTER TABLE initiatives
  DROP CONSTRAINT IF EXISTS initiatives_status_check;

ALTER TABLE initiatives
  ADD CONSTRAINT initiatives_status_check
    CHECK (status IN ('active','on_hold','completed','archived','stale'));

-- 3. Tag existing known prospective deals as such
--    (650 Madison, Xai Rent Reserve — both prospective acquisitions)
UPDATE initiatives
  SET category = 'prospective_investment'
  WHERE id IN (
    'b5a99b78-8970-4746-9a9c-022df6d93555',  -- 650 Madison
    '50ebb179-1910-47cc-82bb-4dc8f36f5ba2'   -- Xai Rent Reserve
  );

-- 4. Verify
SELECT id, name, category, status
  FROM initiatives
  ORDER BY category, status, updated_at DESC;
