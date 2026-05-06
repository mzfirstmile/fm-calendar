-- UPS Renewal profile for 61 S Paramus
-- ─────────────────────────────────────
-- Creates a tenant-specific "evergreen renewal" profile for UPS:
--   • 100% renewal probability
--   • base_rent_psf and escalation_pct pulled from UPS's current rent_roll
--     row IF FOUND (matches "UPS" or "United Parcel"); otherwise defaults
--     to 0 — the profile is still created so Morris can edit later
--   • zero downtime / free rent / TI / LC on both new and renewal paths
--
-- Then assigns the new profile to UPS in rent_roll. Idempotent — safe to
-- re-run after Yardi sync updates UPS's rent_per_sf.

-- Step 1: drop any existing UPS Renewal profile so we re-pull fresh terms
DELETE FROM releasing_profiles
WHERE property_id = 'recqfxJfdqCXCLOuD' AND name = 'UPS Renewal';

-- Step 2: insert the profile. Uses a single-row aggregate so the row is
-- ALWAYS created, even when UPS isn't in the rent roll yet (rent + esc
-- fall back to 0). The notes column documents whether values were pulled
-- from a real rent_roll row or are placeholders.
WITH ups_match AS (
  SELECT
    COALESCE(MAX(rent_per_sf), 0)    AS rent_per_sf,
    COALESCE(MAX(escalation_pct), 0) AS escalation_pct,
    COUNT(*)                          AS hits
  FROM rent_roll
  WHERE property_id = 'recqfxJfdqCXCLOuD'
    AND (tenant_name ILIKE '%UPS%' OR tenant_name ILIKE '%United Parcel%')
)
INSERT INTO releasing_profiles (
  property_id, name, is_default,
  renewal_probability_pct, base_rent_psf,
  new_downtime_months,    renew_downtime_months,
  new_free_rent_months,   renew_free_rent_months,
  new_escalation_pct,     renew_escalation_pct,
  new_ti_psf,             renew_ti_psf,
  new_lc_pct,             renew_lc_pct,
  notes
)
SELECT
  'recqfxJfdqCXCLOuD',
  'UPS Renewal',
  FALSE,
  100,
  rent_per_sf,
  0, 0,
  0, 0,
  escalation_pct, escalation_pct,
  0, 0,
  0, 0,
  CASE
    WHEN hits > 0 THEN
      'UPS-specific evergreen renewal — retains current rental terms with contractual escalation. No TI / LC / free rent / downtime. Rent + escalation auto-pulled from rent_roll at seed time.'
    ELSE
      'UPS-specific evergreen renewal — UPS not yet matched in rent_roll (searched "UPS" / "United Parcel"). base_rent_psf and escalation default to 0; edit via profile modal once UPS appears in the rent roll under a recognizable name.'
  END
FROM ups_match;

-- Step 3: assign the UPS Renewal profile to any matching tenant rows
UPDATE rent_roll
SET releasing_profile_id = (
  SELECT id FROM releasing_profiles
  WHERE property_id = 'recqfxJfdqCXCLOuD' AND name = 'UPS Renewal'
  LIMIT 1
)
WHERE property_id = 'recqfxJfdqCXCLOuD'
  AND (tenant_name ILIKE '%UPS%' OR tenant_name ILIKE '%United Parcel%');

-- Step 4a: verify the profile now exists
SELECT name, base_rent_psf, new_escalation_pct, renewal_probability_pct, notes
FROM releasing_profiles
WHERE property_id = 'recqfxJfdqCXCLOuD' AND name = 'UPS Renewal';

-- Step 4b: show all tenants at this property so we can spot UPS under a
-- different name if step 3 affected zero rows. Look for shipping / parcel
-- / logistics keywords in the output.
SELECT tenant_name, suite, sf, rent_per_sf
FROM rent_roll
WHERE property_id = 'recqfxJfdqCXCLOuD'
ORDER BY tenant_name;
