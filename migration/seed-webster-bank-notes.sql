-- ============================================================
-- Webster Bank Notes — seed initiative + basic underwriting
-- Run in admin.firstmilecap.com → SQL Console
-- ============================================================
-- Thesis: Purchase 3 senior mortgage notes originated by Webster Bank.
-- If performing: earn discount accretion + interest.
-- If default: foreclose and own the underlying property at cost basis
-- well below replacement.
--
-- Three assets:
--   1. 9 Campus Drive, Parsippany, NJ (suburban office ~200K SF)
--   2. 955 Massachusetts Ave, Cambridge, MA (mixed-use office/retail)
--   3. 4300 Roosevelt Commons, Seattle, WA (two-bldg ~229K SF)
-- ============================================================

WITH new_init AS (
  INSERT INTO initiatives (name, summary, status, category, created_by, created_at, updated_at)
  VALUES (
    'Webster Bank Notes',
    E'Evaluating the purchase of three senior mortgage notes originated by Webster Bank, each secured by a stabilized U.S. commercial office asset. Strategy is a classic note-to-own play: bid the notes at a discount to par, earn attractive yields if the borrowers stay current (discount accretion + contract rate), and retain optionality to foreclose and take title if they default — acquiring the underlying real estate at a cost basis below replacement value.\n\n'
    '**Portfolio at a glance:**\n'
    '• **9 Campus Drive, Parsippany NJ** — multi-tenant suburban office, ~200K SF with anchor tenant Securitas Security Services (85K SF, lease runs through 8/31/2031). T12 revenue ≈ $3.08M. Rent roll in hand; loan terms TBD from Webster.\n'
    '• **955 Massachusetts Avenue, Cambridge MA** — mixed-use office/retail in Harvard Square area with established tenant base (Salesforce, Mathematica, Dado Tea). Financial PDFs in folder (2020–2024 lender reporting packages, rent rolls, 2024 year-end financials) — awaiting extraction of key numbers. Strong market fundamentals (Cambridge is one of the deepest office markets in the U.S.).\n'
    '• **4300 Roosevelt Commons, Seattle WA** — two-building 229K SF office campus (4300 + 4311). **Loan: $62.8M at 2.996% fixed (with derivative), matures 12/12/2029.** 2024 budget NOI $7.83M against $1.91M debt service → DSCR 4.1x. T7 July 2024 annualizes to $7.91M NOI (tracking budget). CAUTION: Oct-24 projected cash flow shows NOI dropping from $679K/mo to $411K/mo starting Feb 2025 as UW Board of Regents (68K SF) and Seattle Children''s Hospital (67K SF) leases roll. Post-roll stabilized NOI ≈ $4.9M (still 2.6x DSCR, acceptable cushion).\n\n'
    '**Next steps:**\n'
    '1. Obtain Webster''s offering materials per note (current balance, asking price, stated rate, prepayment language).\n'
    '2. For each, run two-case UW: (a) Performing — buy note at X discount, hold to maturity, compute IRR; (b) Foreclosure — model workout timeline, foreclosure costs, take-title basis, stabilized exit.\n'
    '3. Order BOVs/desktop appraisals on the three collateral properties.\n'
    '4. Bid selectively. 4300 Roosevelt is most diligence-ready given strong in-place cash flow; 9 Campus needs tenant/rollover analysis (Agadia lease expires 1/31/2026 is the near-term item); 955 Mass Ave benefits from strongest market — the debt is likely the best-covered.\n\n'
    '**Open data needs from Webster / Morris:**\n'
    '• Current unpaid principal balance per note.\n'
    '• Stated note rate + amortization (or IO).\n'
    '• Indicative asking / discount range.\n'
    '• Loan maturity (4300 RC known, other two TBD).\n'
    '• Any payment default history or covenant breaches.',
    'active',
    'prospective_investment',
    'mz@firstmilecap.com',
    NOW(), NOW()
  )
  RETURNING id
)
-- Team members
, add_members AS (
  INSERT INTO initiative_members (initiative_id, email, role)
  SELECT id, email, role FROM new_init, (VALUES
    ('mz@firstmilecap.com', 'owner'),
    ('rc@firstmilecap.com', 'member'),
    ('ty@firstmilecap.com', 'member'),
    ('aiassistant@firstmilecap.com', 'member')
  ) AS t(email, role)
  RETURNING initiative_id
)
-- Key-metrics deal-comparison table (pinned on Overview tab)
, add_deal_table AS (
  INSERT INTO initiative_entries (initiative_id, entry_type, title, content, metadata, is_pinned, created_by)
  SELECT id,
    'note',
    'Deal Comparison Matrix — 3 Webster Notes',
    'key_metrics',
    jsonb_build_object(
      'type', 'deal_table',
      'columns', jsonb_build_array(
        'Deal', 'Market', 'Property SF', 'UPB (Est)', 'Note Rate',
        'Maturity', '2024 NOI', 'DSCR', 'Loan / SF', 'Anchor Tenant'
      ),
      'rows', jsonb_build_array(
        jsonb_build_array(
          '9 Campus Drive', 'Parsippany, NJ', '~200K', 'TBD', 'TBD',
          'TBD', '~$1.5-1.8M', 'TBD', 'TBD', 'Securitas 85K SF thru 8/31'
        ),
        jsonb_build_array(
          '955 Mass Ave', 'Cambridge, MA', 'TBD', 'TBD', 'TBD',
          'TBD', 'TBD', 'TBD', 'TBD', 'Salesforce / Mathematica'
        ),
        jsonb_build_array(
          '4300 Roosevelt Commons', 'Seattle, WA', '229K', '$62.8M', '2.996%',
          '12/12/2029', '$7.83M', '4.1x', '$274', 'Seattle CHOP / UW Regents'
        )
      ),
      'highlight_row', 2,
      'summary_stats', jsonb_build_array(
        jsonb_build_object('value', '3', 'label', 'Notes'),
        jsonb_build_object('value', '$62.8M+', 'label', 'Confirmed UPB'),
        jsonb_build_object('value', 'NJ / MA / WA', 'label', 'Markets'),
        jsonb_build_object('value', '2.996%–?', 'label', 'Note Rate Range')
      )
    ),
    TRUE,
    'aiassistant@firstmilecap.com'
  FROM new_init
  RETURNING initiative_id
)
-- Milestones for each deal
, add_milestones AS (
  INSERT INTO initiative_entries (initiative_id, entry_type, title, content, metadata, created_by)
  SELECT id, 'milestone', title, '',
    jsonb_build_object('due_date', due_date, 'completed', false),
    'aiassistant@firstmilecap.com'
  FROM new_init, (VALUES
    ('Obtain Webster offering materials (all 3 notes)', '2026-05-05'),
    ('BOV / desktop appraisals ordered',                '2026-05-08'),
    ('9 Campus — performing + foreclosure UW complete', '2026-05-15'),
    ('955 Mass Ave — performing + foreclosure UW complete', '2026-05-15'),
    ('4300 Roosevelt — performing + foreclosure UW complete', '2026-05-15'),
    ('Indicative bids to Webster',                      '2026-05-22'),
    ('Final bids / note purchase close',                '2026-06-30')
  ) AS t(title, due_date)
  RETURNING initiative_id
)
-- Pinned notes summarizing each deal's current state of info
, add_deal_notes AS (
  INSERT INTO initiative_entries (initiative_id, entry_type, title, content, metadata, is_pinned, created_by)
  SELECT id, 'note', title, content, '{}', TRUE, 'aiassistant@firstmilecap.com'
  FROM new_init, (VALUES
    ('9 Campus Drive — Deal Snapshot',
     E'**Location:** 9 Campus Drive, Parsippany, NJ (Morris County suburban office market)\n\n'
     E'**Rent roll (as of 7/31/2024):**\n'
     E'• Securitas Security Services — 85,233 SF, $133,682/mo ($1.60M/yr), thru 8/31/2031 (ANCHOR, 53% of revenue)\n'
     E'• Conner Strong Companies — 11,661 SF, $25,266/mo ($303K/yr), thru 1/31/2032\n'
     E'• Kaufman Borgeest & Ryan — 11,999 SF, $25,645/mo, thru 7/31/2030\n'
     E'• Agadia Systems — 12,944 SF, $29,576/mo, thru 1/31/2026 (NEAR-TERM ROLL)\n'
     E'• Safety Sells — 6,732 SF, $15,147/mo, thru 8/31/2025 (NEAR-TERM ROLL)\n'
     E'• MD3PL — 3,669 SF, $8,714/mo, thru 8/31/2025\n'
     E'• Make Some Noise — 1,746 SF, MTM\n'
     E'• Verizon NJ — long dated term through 2099\n\n'
     E'**T12 Financials (Aug 2023 – Jul 2024):**\n'
     E'• Total Revenue: $3,078,841\n'
     E'• Rent Revenue: $2,704,376 (88% of total)\n'
     E'• Recoveries: $261,351\n'
     E'• Other Revenue: $113,114\n'
     E'• OpEx visible (truncated): R&M $340K, Utilities $433K, Cleaning $239K, Landscape $93K, Mgmt Fee $69K, Security $22K, Insurance $62K (partial)\n\n'
     E'**Concentration risk:** Securitas = 53% of revenue. Their lease runs to 8/31/2031 — healthy runway, but single-tenant exposure.\n'
     E'**Near-term rollover risk:** Agadia (Jan 2026), Safety Sells (Aug 2025), MD3PL (Aug 2025) = ~23,345 SF rolling in next 12-18 months.\n\n'
     E'**Documents in folder:** 5 executed leases (Agadia, Conner Strong, KBR, Securitas, + Agadia 6th amendment), Phase I ESA, PCA, appraisal.\n\n'
     E'**Still need for UW:** Webster loan balance, rate, maturity. Pricing target.'),

    ('955 Massachusetts Ave — Deal Snapshot',
     E'**Location:** 955 Massachusetts Avenue, Cambridge, MA (Harvard Square adjacent — one of the deepest, most durable office/mixed-use markets in the U.S.)\n\n'
     E'**Known tenants:**\n'
     E'• Salesforce — major tenant (1st amendment executed)\n'
     E'• Mathematica — long-term tenant with multiple amendments (10th-13th)\n'
     E'• Dado Tea — retail (multiple amendments incl. 4th rent abatement + 8th amendment 11/20/2023)\n'
     E'• X4 Pharmaceuticals — **terminated** (documented termination on file)\n\n'
     E'**Financial sources in folder (all PDF — need pypdf install to extract):**\n'
     E'• 2020–2024 Q4 Lender Reporting Packages (covers loan performance through YE 2024)\n'
     E'• 2024 YE Financial Statement\n'
     E'• 2023 + 2024 Balance Sheets\n'
     E'• 12-Month Income Statement (no date — recent)\n'
     E'• Rent rolls (2020, 2022)\n'
     E'• Building Info Sheet\n'
     E'• 2021 Budget (revised)\n\n'
     E'**Still need for UW:** All financial data (stuck in PDFs until re-scan with pypdf). Webster loan balance, rate, maturity. Current rent roll. Status of X4 space (re-let?).'),

    ('4300 Roosevelt Commons — Deal Snapshot',
     E'**Location:** 4300 / 4311 Roosevelt Way NE, Seattle WA (two-building office campus in U-District)\n\n'
     E'**Loan (confirmed from projected cash flow model):**\n'
     E'• **Original principal: $62,800,000**\n'
     E'• **Rate: 2.996% fixed (with derivative / swap)**\n'
     E'• **Maturity: 12/12/2029 (~3.7 years remaining)**\n'
     E'• Monthly debt service: ~$160K (IO or near-IO given $1.91M annual)\n\n'
     E'**In-place tenancy (Oct 2024 model):**\n'
     E'• **UW Board of Regents — 68,034 SF, expires 1/31/2025** ⚠ rolled or rolling\n'
     E'• **Seattle Children''s Hospital — 67,093 SF, expires 8/31/2025** ⚠ near-term\n'
     E'• UW — 61,966 SF at 4311, expires 6/30/2027\n'
     E'• Industrious — 32,206 SF, 6/30/2025*\n'
     E'• Plus parking income (4300 + 4311)\n\n'
     E'**Financials:**\n'
     E'• **2024 Budget:** Revenue $11.09M, OpEx $3.26M, **NOI $7.83M**, Debt Service $1.91M → Net Cash Flow $5.67M\n'
     E'• **T7 Jul 2024 (annualized):** Revenue $11.04M, OpEx $3.14M, NOI $7.91M (tracking budget)\n'
     E'• **DSCR: 4.1x** (very strong)\n'
     E'• **Post-roll projected NOI (Feb 2025+):** $411K/mo = ~$4.9M/yr. DSCR drops to 2.6x — still healthy.\n\n'
     E'**Balance Sheet (Jul 2024):**\n'
     E'• Operating cash: $248K\n'
     E'• BR escrow: $1.44M\n'
     E'• RE tax escrow: $325K\n'
     E'• Insurance escrow: $245K\n'
     E'• Land book: $25.3M, Buildings book: $132M\n'
     E'• Original loan: $62.8M, Contributed equity: $93.9M, Distributions: -$22.1M\n\n'
     E'**Why this is the most attractive of the three:**\n'
     E'• Low coupon (2.996%) is below-market — borrower has strong incentive to keep paying, low default risk near term. BUT discount-to-par on the note could be substantial because NEW money has no appetite for sub-3% paper → note buyer captures YTM much higher than coupon.\n'
     E'• Strong in-place cash flow with ample cushion even after 2025 lease rolls.\n'
     E'• Should there be a workout, 229K SF of Seattle office at ~$274/SF loan basis is interesting vs. replacement cost.\n\n'
     E'**Documents in folder:** full 2024 budget xlsx, balance sheet, YTD P&L, leasing activity, projected cash flow, plus extensive PDFs (lender reports, appraisal, Phase I, PCA, floor plans, executed leases for CHOP, UW, Industrious).\n\n'
     E'**Still need for UW:** Webster offer price (discount %), any loan modifications / covenant status, MTM status of 2025 rollover leases (renewal discussions?).')
  ) AS t(title, content)
  RETURNING initiative_id
)
-- Document entries linking to folder locations in Dropbox
INSERT INTO initiative_entries (initiative_id, entry_type, title, content, metadata, created_by)
SELECT id, 'document', title, content,
  jsonb_build_object('url', url, 'filename', filename),
  'aiassistant@firstmilecap.com'
FROM new_init, (VALUES
  ('9 Campus — Dropbox folder',
   'Financials, leases, and 3rd-party reports',
   '',
   '1.1 Projects - Prospective/9 Campus - Webster'),
  ('955 Mass Ave — Dropbox folder',
   'Financials, leases, and 3rd-party reports',
   '',
   '1.1 Projects - Prospective/955 Mass Ave - Webster'),
  ('4300 Roosevelt — Dropbox folder',
   '63 files: financials, drawings, leases, 3rd-party reports',
   '',
   '1.1 Projects - Prospective/4300 Roosevelt - Webster')
) AS t(title, content, url, filename);

-- Verify
SELECT id, name, status, category, created_at
FROM initiatives
WHERE name = 'Webster Bank Notes';

SELECT entry_type, title, is_pinned
FROM initiative_entries
WHERE initiative_id = (SELECT id FROM initiatives WHERE name = 'Webster Bank Notes')
ORDER BY is_pinned DESC, created_at ASC;
