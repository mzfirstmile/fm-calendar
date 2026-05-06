-- Re-Leasing Profiles seed for 61 S Paramus
-- (property_id = 'recqfxJfdqCXCLOuD' — the Airtable rec ID; the Yardi
-- code 'p0000005' is only a mapping label inside sync_rent_rolls.py)
-- ────────────────────────────────────────────────────────────────────
--
-- Cleanup: drop any rows accidentally seeded under the wrong property_id
-- ('p0000005') from the first attempt at this script.
DELETE FROM releasing_profiles WHERE property_id = 'p0000005';


-- Sourced from the Argus market-leasing assumptions tab Morris pulled
-- on 2026-05-05. Seven profiles mirror the seven rows in Argus:
--   Storage, Antenna, > 25,000 SF, > 5,000 SF, < 5,000 SF,
--   UBS Renewal, MS Renewal
--
-- Argus → schema mapping:
--   Renewal %                 → renewal_probability_pct
--   Months Vacant             → new_downtime_months  (renew_downtime = 0
--                               by Argus convention — renewals don't vacate)
--   New Base Rent ($/SF/yr)   → base_rent_psf
--   % Increase                → new_escalation_pct = renew_escalation_pct
--   New / Renew Free Rent     → new/renew_free_rent_months
--   "$X / $Y" TI amount       → new_ti_psf / renew_ti_psf
--   Fixed % LC                → new_lc_pct = renew_lc_pct
--
-- Antenna's "rent" is $7,250/month flat (rooftop access, not $/SF), so
-- base_rent_psf is left at 0 and the cap-rate-equivalent $/SF will need
-- to be derived from the leased equivalent SF when applied. See notes.
--
-- "< 5,000 SF" is set as is_default since most leasable suites at 61 S
-- Paramus are sub-5,000-SF office suites. Morris can change the default
-- via the profile modal if a different size band becomes more typical.
--
-- Idempotent: clears any existing seeded rows first (matched by name) so
-- this script can be re-run after Argus updates without creating dupes.
-- Custom profiles created manually via the UI are preserved.
--
-- NOTE: the admin SQL Console runs through a pgBouncer-style pool that
-- doesn't accept explicit BEGIN/COMMIT (errors with 0A000 "EXECUTE of
-- transaction commands is not implemented"). The DELETE + INSERT below
-- run as separate statements, which is fine for a single-property seed.

DELETE FROM releasing_profiles
 WHERE property_id = 'recqfxJfdqCXCLOuD'
   AND name IN ('Storage', 'Antenna', '> 25,000 SF', '> 5,000 SF',
                '< 5,000 SF', 'UBS Renewal', 'MS Renewal');

INSERT INTO releasing_profiles (
  property_id, name, is_default,
  renewal_probability_pct, base_rent_psf,
  new_downtime_months,   renew_downtime_months,
  new_free_rent_months,  renew_free_rent_months,
  new_escalation_pct,    renew_escalation_pct,
  new_ti_psf,            renew_ti_psf,
  new_lc_pct,            renew_lc_pct,
  notes
) VALUES
-- ── Storage ──
('recqfxJfdqCXCLOuD', 'Storage',     FALSE,
 75,   15.00,
 9,    0,
 0,    0,
 2.75, 2.75,
 0,    0,
 6.25, 6.25,
 'Argus Market Leasing — Storage. Term 5y/3m. Inflation: Market Inflation Rate.'),

-- ── Antenna ──
('recqfxJfdqCXCLOuD', 'Antenna',     FALSE,
 100,  0,
 0,    0,
 0,    0,
 3.00, 3.00,
 0,    0,
 0,    0,
 'Argus Market Leasing — Antenna. Rent quoted as $7,250 / month flat (not $/SF) — base_rent_psf left at 0. Term 5y/0m. Inflation: Market Inflation Rate.'),

-- ── > 25,000 SF ──
('recqfxJfdqCXCLOuD', '> 25,000 SF', FALSE,
 65,   34.00,
 9,    0,
 10,   6,
 2.75, 2.75,
 70,   25,
 6.25, 6.25,
 'Argus Market Leasing — Large floors >25,000 SF. Term 10y/5m. TI: $70 new / $25 renew. Inflation: Market Inflation Rate.'),

-- ── > 5,000 SF ──
('recqfxJfdqCXCLOuD', '> 5,000 SF',  FALSE,
 65,   36.00,
 9,    0,
 10,   4,
 2.75, 2.75,
 60,   25,
 6.25, 6.25,
 'Argus Market Leasing — Mid-size 5,000–25,000 SF. Term 7y/5m. TI: $60 new / $25 renew. Inflation: Market Inflation Rate.'),

-- ── < 5,000 SF (DEFAULT) ──
('recqfxJfdqCXCLOuD', '< 5,000 SF',  TRUE,
 65,   37.50,
 9,    0,
 6,    2,
 2.75, 2.75,
 40,   20,
 6.25, 6.25,
 'Argus Market Leasing — Small suites <5,000 SF. Term 5y/3m. TI: $40 new / $20 renew. Default profile for the property — most suites at 61 S Paramus fall here.'),

-- ── UBS Renewal ──
('recqfxJfdqCXCLOuD', 'UBS Renewal', FALSE,
 50,   38.00,
 0,    0,
 0,    0,
 2.00, 2.00,
 0,    0,
 0,    0,
 'Argus Market Leasing — UBS-specific renewal scenario. Term 7y/7m. No TI / no LC / no free rent / no downtime per Argus.'),

-- ── MS Renewal ──
('recqfxJfdqCXCLOuD', 'MS Renewal',  FALSE,
 100,  36.00,
 0,    0,
 0,    0,
 2.50, 2.50,
 0,    0,
 6.25, 6.25,
 'Argus Market Leasing — MS-specific renewal scenario. Term 7y/8m. No inflation. No TI / no free rent / no downtime per Argus. LC: 6.25% / 6.25%.');

-- Verify
SELECT name, renewal_probability_pct AS renew_pct,
       base_rent_psf,
       new_downtime_months   AS dt_new,  renew_downtime_months   AS dt_ren,
       new_free_rent_months  AS fr_new,  renew_free_rent_months  AS fr_ren,
       new_escalation_pct    AS esc,
       new_ti_psf            AS ti_new,  renew_ti_psf            AS ti_ren,
       new_lc_pct            AS lc_new,  renew_lc_pct            AS lc_ren,
       is_default
  FROM releasing_profiles
 WHERE property_id = 'recqfxJfdqCXCLOuD'
 ORDER BY is_default DESC, name;
