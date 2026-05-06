-- Per-tenant Re-Leasing Profile assignment.
-- ──────────────────────────────────────────
-- Each row in rent_roll can optionally point at a row in releasing_profiles
-- (per-property profile). When set, forward projections (auto revenue budget,
-- cash forecast lease-up modeling) use the profile's blended assumptions
-- after the existing lease's lease_end:
--
--   • Hold $0 rent for `blended downtime` months (vacancy)
--   • Hold $0 rent for `blended free_rent` months (tenant in place but free)
--   • Resume rent at `base_rent_psf × sf / 12` per month
--   • Apply `blended escalation_pct` annually thereafter
--   • Capital events at lease commencement: TI = ti_psf × sf,
--     LC = lc_pct × annual rent over the deal term
--
-- If no profile is assigned, projection drops to $0 at lease_end (the
-- current conservative behavior).
--
-- Run via the admin SQL Console (admin.firstmilecap.com → SQL Console).

ALTER TABLE rent_roll
  ADD COLUMN IF NOT EXISTS releasing_profile_id UUID;

CREATE INDEX IF NOT EXISTS idx_rent_roll_profile
  ON rent_roll(releasing_profile_id);

COMMENT ON COLUMN rent_roll.releasing_profile_id IS
  'Optional link to releasing_profiles. When set, this tenant''s forward rent projection uses the profile''s blended assumptions after lease_end.';
