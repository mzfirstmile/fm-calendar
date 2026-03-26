-- ══════════════════════════════════════════════════════════════
-- Executive Dashboard Tables — migrated from Airtable to Supabase
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Bank Transactions (corporate accounts)
CREATE TABLE IF NOT EXISTS exec_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(14,2) DEFAULT 0,
  ledger_balance NUMERIC(14,2),
  transaction_type TEXT DEFAULT '',
  credit_debit TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exec_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exec_transactions" ON exec_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_exec_transactions_date ON exec_transactions(date);
CREATE INDEX IF NOT EXISTS idx_exec_transactions_account ON exec_transactions(account_number);

-- 2. Investments (balance sheet)
CREATE TABLE IF NOT EXISTS exec_investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  membership_class TEXT DEFAULT '',
  ownership_pct NUMERIC(8,4) DEFAULT 0,
  committed NUMERIC(14,2) DEFAULT 0,
  contributed NUMERIC(14,2) DEFAULT 0,
  distributed NUMERIC(14,2) DEFAULT 0,
  unreturned_capital NUMERIC(14,2) DEFAULT 0,
  net_equity NUMERIC(14,2) DEFAULT 0,
  valuation NUMERIC(14,2),
  status TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exec_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exec_investments" ON exec_investments
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Liabilities (balance sheet)
CREATE TABLE IF NOT EXISTS exec_liabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lender TEXT NOT NULL,
  related_deal TEXT DEFAULT '',
  principal NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  usd_equivalent NUMERIC(14,2),
  maturity_date DATE,
  status TEXT DEFAULT 'Active',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exec_liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to exec_liabilities" ON exec_liabilities
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_exec_liabilities_maturity ON exec_liabilities(maturity_date);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_exec_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_exec_investments_updated_at ON exec_investments;
CREATE TRIGGER set_exec_investments_updated_at
  BEFORE UPDATE ON exec_investments
  FOR EACH ROW EXECUTE FUNCTION update_exec_investments_updated_at();

CREATE OR REPLACE FUNCTION update_exec_liabilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_exec_liabilities_updated_at ON exec_liabilities;
CREATE TRIGGER set_exec_liabilities_updated_at
  BEFORE UPDATE ON exec_liabilities
  FOR EACH ROW EXECUTE FUNCTION update_exec_liabilities_updated_at();
