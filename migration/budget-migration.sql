-- ============================================
-- First Mile Capital — Budget Table Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Budget line items: one row per property/account/month
CREATE TABLE IF NOT EXISTS budget_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  gl_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, gl_code, year, month)
);

-- Indexes for fast queries
CREATE INDEX idx_budget_property ON budget_line_items(property_id);
CREATE INDEX idx_budget_gl ON budget_line_items(gl_code);
CREATE INDEX idx_budget_year_month ON budget_line_items(year, month);
CREATE INDEX idx_budget_property_year ON budget_line_items(property_id, year);

-- RLS + anon access (matching existing pattern)
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON budget_line_items FOR ALL USING (true) WITH CHECK (true);

-- Add missing GL accounts found in budget files
-- (These exist in the Yardi COA but weren't in the original gl-accounts.json)
