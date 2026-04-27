-- Add payroll_split column to exec_transactions
-- Used to flag a portion of a Property Management Fee Income transaction as
-- payroll reimbursement (deducted from the PM fee's gross amount on the
-- exec dashboard). Set via the "✂️ Split payroll" button in the drilldown
-- and upload review screens. Replaces the old hardcoded
-- KNOWN_PAYROLL_SPLITS_BY_AMOUNT list (which remains as a fallback for
-- legacy records).
ALTER TABLE exec_transactions ADD COLUMN IF NOT EXISTS payroll_split NUMERIC(14,2);
