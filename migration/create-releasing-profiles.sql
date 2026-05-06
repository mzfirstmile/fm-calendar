-- Re-leasing Profiles
-- ───────────────────
-- Underwriting assumptions for what happens when an existing lease rolls.
-- Each profile captures both a "new lease" path (tenant doesn't renew, we
-- re-let the suite to a new tenant) and a "renewal" path (existing tenant
-- stays), with a renewal probability used to compute a blended expected
-- value for each assumption.
--
-- Base rent is captured as a single value (Morris: rent doesn't need two
-- values for new vs renew; one $/SF figure represents the market rent
-- that gets locked in either way). All other levers — downtime, free
-- rent, escalation, TI, LC — are modeled separately for new vs. renewal
-- since renewals are typically faster, cheaper, and have shorter free
-- rent / lower TI than a fresh new lease.
--
-- Blended value math (computed in the UI, not stored):
--   blended = (renewal_pct/100) * renew_<x>
--           + (1 - renewal_pct/100) * new_<x>
--
-- Multiple profiles per property are allowed (e.g. "Default", "Anchor
-- Tenant", "Small Suites"). One profile may be flagged is_default=true
-- so downstream cash-flow / lease-up modules can pick it without a UI
-- selection.
--
-- Run via the admin SQL Console (admin.firstmilecap.com → SQL Console).

CREATE TABLE IF NOT EXISTS releasing_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              TEXT NOT NULL,                -- recXXX or prop_XX
  name                     TEXT NOT NULL,                -- e.g. 'Default', 'Anchor', 'Small Suites'
  is_default               BOOLEAN NOT NULL DEFAULT FALSE,

  -- Renewal probability (0-100). Drives blending math.
  renewal_probability_pct  NUMERIC(5,2) NOT NULL DEFAULT 50,

  -- Single-value rent (no new/renew split per Morris)
  base_rent_psf            NUMERIC(10,2),                -- $/SF/yr starting market rent

  -- New-lease (downtime / free / escalation / TI / LC)
  new_downtime_months      NUMERIC(6,2),                 -- months of vacancy before new tenant starts
  new_free_rent_months     NUMERIC(6,2),                 -- months of free rent on new lease
  new_escalation_pct       NUMERIC(6,3),                 -- annual contractual bump (% / yr)
  new_ti_psf               NUMERIC(10,2),                -- tenant improvement allowance ($/SF)
  new_lc_pct               NUMERIC(6,3),                 -- leasing commission (% of total rent over term)

  -- Renewal
  renew_downtime_months    NUMERIC(6,2),
  renew_free_rent_months   NUMERIC(6,2),
  renew_escalation_pct     NUMERIC(6,3),
  renew_ti_psf             NUMERIC(10,2),
  renew_lc_pct             NUMERIC(6,3),

  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_releasing_profiles_property
  ON releasing_profiles(property_id);

-- Enforce at most one default profile per property
CREATE UNIQUE INDEX IF NOT EXISTS uq_releasing_profiles_default
  ON releasing_profiles(property_id)
  WHERE is_default;

COMMENT ON TABLE releasing_profiles IS
  'Underwriting profile for re-leasing assumptions on lease rollover. Drives blended (probability-weighted) downtime / free rent / escalation / TI / LC inputs to the cash-forecast model.';

COMMENT ON COLUMN releasing_profiles.renewal_probability_pct IS
  'Probability the existing tenant renews (0-100). Blend = pct * renew + (100-pct) * new for each assumption.';
