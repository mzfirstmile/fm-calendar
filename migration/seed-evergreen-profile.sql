-- Evergreen Renewal profile for 61 S Paramus
-- ───────────────────────────────────────────
-- A tenant-agnostic "just continue the lease" profile. Used for tenants we
-- expect to renew indefinitely at their current contractual terms, with
-- no friction (no downtime, no free rent, no TI, no LC).
--
-- KEY DESIGN: base_rent_psf and escalation columns are LEFT NULL on this
-- profile. The projection logic treats a NULL rent as a signal to carry
-- forward the tenant's CURRENT rent_per_sf (so different tenants can share
-- this profile without one tenant's rate leaking into another's projection).
-- Likewise, a NULL escalation falls back to each tenant's own contractual
-- escalation_pct.
--
-- Assigns to UPS and Paramus World Motors out of the box. Add more tenants
-- via the rent-roll dropdown or by extending the WHERE clause in step 3.

-- Step 1: drop any prior incarnations of this profile
DELETE FROM releasing_profiles
WHERE property_id = 'recqfxJfdqCXCLOuD'
  AND name IN ('UPS Renewal', 'Evergreen Renewal');

-- Step 2: insert the Evergreen Renewal profile.
-- 100% renewal probability + NULL rent + NULL escalation = carry-forward.
INSERT INTO releasing_profiles (
  property_id, name, is_default,
  renewal_probability_pct, base_rent_psf,
  new_downtime_months,    renew_downtime_months,
  new_free_rent_months,   renew_free_rent_months,
  new_escalation_pct,     renew_escalation_pct,
  new_ti_psf,             renew_ti_psf,
  new_lc_pct,             renew_lc_pct,
  notes
) VALUES (
  'recqfxJfdqCXCLOuD',
  'Evergreen Renewal',
  FALSE,
  100,
  NULL,         -- base_rent_psf NULL → projection carries forward tenant''s current rent
  0, 0,
  0, 0,
  NULL, NULL,   -- escalation NULL → projection carries forward tenant''s contractual escalation
  0, 0,
  0, 0,
  'Catchall "just continues the lease" profile. NULL rent and escalation are intentional — the projection logic carries forward each assigned tenant''s current rate + contractual escalation, so multiple tenants can share this profile cleanly. No downtime / free rent / TI / LC. Currently assigned to UPS and Paramus World Motors.'
);

-- Step 3: assign UPS and Paramus World Motors to the Evergreen profile
UPDATE rent_roll
SET releasing_profile_id = (
  SELECT id FROM releasing_profiles
  WHERE property_id = 'recqfxJfdqCXCLOuD' AND name = 'Evergreen Renewal'
  LIMIT 1
)
WHERE property_id = 'recqfxJfdqCXCLOuD'
  AND (
       tenant_name ILIKE '%UPS%'
    OR tenant_name ILIKE '%United Parcel%'
    OR tenant_name ILIKE '%Paramus World Motors%'
    OR tenant_name ILIKE '%Paramus World%'
  );

-- Step 4a: verify the profile exists
SELECT name, base_rent_psf, new_escalation_pct, renewal_probability_pct
FROM releasing_profiles
WHERE property_id = 'recqfxJfdqCXCLOuD' AND name = 'Evergreen Renewal';

-- Step 4b: confirm the tenant assignments landed
SELECT tenant_name, suite, sf, rent_per_sf, escalation_pct,
       (SELECT name FROM releasing_profiles rp WHERE rp.id = rr.releasing_profile_id) AS profile
FROM rent_roll rr
WHERE rr.property_id = 'recqfxJfdqCXCLOuD'
  AND (
       tenant_name ILIKE '%UPS%'
    OR tenant_name ILIKE '%United Parcel%'
    OR tenant_name ILIKE '%Paramus World%'
  );

-- Step 4c: full tenant list — paste back if Step 4b shows zero matches so
-- we can spot UPS / Paramus World Motors under different names.
SELECT tenant_name, suite, sf
FROM rent_roll
WHERE property_id = 'recqfxJfdqCXCLOuD'
ORDER BY tenant_name;
