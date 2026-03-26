-- Add property_id column to exec_investments to optionally link an investment to a property
-- When linked, the asset value is pulled from properties.current_valuation
-- When NULL, the manual valuation field is used instead

ALTER TABLE exec_investments ADD COLUMN IF NOT EXISTS property_id text;

-- Optional: create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exec_investments_property_id ON exec_investments(property_id);
