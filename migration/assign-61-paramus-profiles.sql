-- Auto-assign Re-Leasing Profiles to 61 S Paramus tenants
-- ────────────────────────────────────────────────────────
-- Clears any prior assignments for the property, then re-applies based
-- on these rules (in priority order — first match wins):
--
--   1. UBS                              → UBS Renewal
--   2. Morgan Stanley                   → MS Renewal
--   3. UPS / Paramus World Motors       → Evergreen Renewal
--   4. Rooftop telecom (ROOF* suite, or
--      tenant name contains T-Mobile /
--      Verizon / Telecom / CenturyLink /
--      AT&T / Sprint / Antenna)         → Antenna
--   5. Storage (STOR* suite or
--      "storage" in tenant name)        → Storage
--   6. SF > 25,000                      → > 25,000 SF
--   7. SF > 5,000                       → > 5,000 SF
--   8. SF > 0                           → < 5,000 SF
--   9. otherwise                        → unassigned (NULL)
--
-- Run via admin SQL Console. Idempotent — safe to re-run any time.

-- Step 1: clear existing assignments for this property
UPDATE rent_roll
SET releasing_profile_id = NULL
WHERE property_id = 'recqfxJfdqCXCLOuD';

-- Step 2: reapply rules
UPDATE rent_roll rr
SET releasing_profile_id = rp.id
FROM releasing_profiles rp
WHERE rr.property_id = 'recqfxJfdqCXCLOuD'
  AND rp.property_id = 'recqfxJfdqCXCLOuD'
  AND rp.name = (
    CASE
      -- Named-tenant overrides first
      WHEN rr.tenant_name ILIKE '%UBS%'                         THEN 'UBS Renewal'
      WHEN rr.tenant_name ILIKE '%Morgan Stanley%'              THEN 'MS Renewal'
      WHEN rr.tenant_name ILIKE '%UPS%'
        OR rr.tenant_name ILIKE '%United Parcel%'
        OR rr.tenant_name ILIKE '%Paramus World Motors%'
        OR rr.tenant_name ILIKE '%Paramus World%'               THEN 'Evergreen Renewal'

      -- Rooftop antenna / telecom
      WHEN rr.suite ILIKE 'ROOF%'
        OR rr.tenant_name ILIKE '%T-Mobile%'
        OR rr.tenant_name ILIKE '%T Mobile%'
        OR rr.tenant_name ILIKE '%Verizon%'
        OR rr.tenant_name ILIKE '%Telecom%'
        OR rr.tenant_name ILIKE '%CenturyLink%'
        OR rr.tenant_name ILIKE '%Century Link%'
        OR rr.tenant_name ILIKE '%Antenna%'
        OR rr.tenant_name ILIKE '%AT&T%'
        OR rr.tenant_name ILIKE '%AT %T%'
        OR rr.tenant_name ILIKE '%Sprint%'
        OR rr.tenant_name ILIKE '%Crown Castle%'
        OR rr.tenant_name ILIKE '%American Tower%'              THEN 'Antenna'

      -- Storage
      WHEN rr.suite ILIKE 'STOR%'
        OR rr.suite ILIKE '%STORAGE%'
        OR rr.tenant_name ILIKE '%storage%'                     THEN 'Storage'

      -- Size buckets
      WHEN COALESCE(rr.sf, 0) > 25000                           THEN '> 25,000 SF'
      WHEN COALESCE(rr.sf, 0) > 5000                            THEN '> 5,000 SF'
      WHEN COALESCE(rr.sf, 0) > 0                               THEN '< 5,000 SF'
      ELSE NULL
    END
  );

-- Step 3: verify — show how each tenant got categorized
SELECT
  COALESCE(rp.name, '— UNASSIGNED —')             AS profile,
  COUNT(*)                                         AS tenant_count,
  SUM(rr.sf)                                       AS total_sf,
  STRING_AGG(
    rr.tenant_name || COALESCE(' (' || rr.suite || ')', ''),
    ', '
    ORDER BY rr.tenant_name
  )                                                AS tenants
FROM rent_roll rr
LEFT JOIN releasing_profiles rp ON rp.id = rr.releasing_profile_id
WHERE rr.property_id = 'recqfxJfdqCXCLOuD'
GROUP BY rp.name
ORDER BY total_sf DESC NULLS LAST;
