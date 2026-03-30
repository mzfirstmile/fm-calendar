-- Add 132-40 Metropolitan Ave mortgage to balance_sheet_items
-- Mortgage = $15,085,000 per Morris
-- Position value calc: (NOI $1,124,216 / 6% cap) = $18,736,933 gross
--   $18,736,933 - $15,085,000 mortgage = $3,651,933 net
--   $3,651,933 × 7.47% equity = $272,799 position value

-- Remove any existing mortgage row for this property
DELETE FROM balance_sheet_items
WHERE property_id = 'prop_132_40_metropolitan'
  AND (bs_code = '2100' OR lower(account_name) LIKE '%mortgage%');

-- Insert mortgage
INSERT INTO balance_sheet_items (property_id, bs_code, amount, account_section, account_name, is_header, is_total)
VALUES ('prop_132_40_metropolitan', '2100', 15085000, 'Liabilities', 'Mortgage Payable', false, false);
