-- ============================================================
-- ACTIVE INITIATIVES MODULE  –  project tracking & comms log
-- ============================================================

-- Main initiatives table
CREATE TABLE IF NOT EXISTS initiatives (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  summary       TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','archived')),
  property_id   TEXT,                              -- optional FK to properties
  created_by    TEXT NOT NULL,                     -- email of creator
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_initiatives_status ON initiatives (status);
CREATE INDEX idx_initiatives_created ON initiatives (created_at DESC);

-- Who can see / participate in each initiative
CREATE TABLE IF NOT EXISTS initiative_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id   UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT DEFAULT 'member' CHECK (role IN ('owner','member','viewer')),
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(initiative_id, email)
);

CREATE INDEX idx_init_members_email ON initiative_members (email);
CREATE INDEX idx_init_members_init  ON initiative_members (initiative_id);

-- Chronological log of all activity (emails, notes, milestones, documents, tasks)
CREATE TABLE IF NOT EXISTS initiative_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id   UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('email','note','milestone','document','task')),
  title           TEXT,
  content         TEXT,
  metadata        JSONB DEFAULT '{}',
  -- email: {from, to, cc, email_id, direction}
  -- milestone: {due_date, completed, completed_at}
  -- document: {url, filename, size}
  -- task: {assignee, due_date, completed, completed_at}
  is_pinned       BOOLEAN DEFAULT FALSE,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_init_entries_init   ON initiative_entries (initiative_id, created_at DESC);
CREATE INDEX idx_init_entries_type   ON initiative_entries (entry_type);
CREATE INDEX idx_init_entries_pinned ON initiative_entries (is_pinned) WHERE is_pinned = TRUE;

-- RLS policies
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON initiatives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE initiative_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON initiative_members FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE initiative_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON initiative_entries FOR ALL USING (true) WITH CHECK (true);
