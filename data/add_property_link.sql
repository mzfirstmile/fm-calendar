-- Add property_id and cap_rate columns to exec_investments
-- property_id: optionally link an investment to a property for auto-valuation
-- cap_rate: capitalization rate used in the valuation formula
-- Formula: (Property NOI / cap_rate) - property_debt × equity_%

ALTER TABLE exec_investments ADD COLUMN IF NOT EXISTS property_id text;
ALTER TABLE exec_investments ADD COLUMN IF NOT EXISTS cap_rate numeric;

-- Optional: create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exec_investments_property_id ON exec_investments(property_id);
