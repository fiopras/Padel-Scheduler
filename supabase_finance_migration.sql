-- ============================================================
-- COTTA MASTER FINANCE — Supabase Migration Script
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE 1: Finance Events
-- Links to PadelEvent via event_id (references padel_data JSONB)
CREATE TABLE IF NOT EXISTS finance_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  court_fee NUMERIC(12,2) DEFAULT 0,
  additional_fee NUMERIC(12,2) DEFAULT 0,
  tax_type TEXT DEFAULT 'percentage',
  tax_value NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  final_total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_events DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_events_event_id ON finance_events(event_id);
CREATE INDEX IF NOT EXISTS idx_finance_events_status ON finance_events(status);
CREATE INDEX IF NOT EXISTS idx_finance_events_date ON finance_events(session_date DESC);

-- TABLE 2: Finance Participants
CREATE TABLE IF NOT EXISTS finance_participants (
  id TEXT PRIMARY KEY,
  finance_event_id TEXT NOT NULL REFERENCES finance_events(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  attendance_status TEXT DEFAULT 'hadir',
  split_type TEXT DEFAULT 'equal',
  custom_amount NUMERIC(12,2) DEFAULT 0,
  final_charge NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_participants DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_participants_event ON finance_participants(finance_event_id);
CREATE INDEX IF NOT EXISTS idx_finance_participants_player ON finance_participants(player_id);

-- TABLE 3: Finance Payments
CREATE TABLE IF NOT EXISTS finance_payments (
  id TEXT PRIMARY KEY,
  finance_event_id TEXT NOT NULL REFERENCES finance_events(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'transfer',
  notes TEXT,
  proof_url TEXT,
  recorded_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_payments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_payments_event ON finance_payments(finance_event_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_player ON finance_payments(player_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_date ON finance_payments(payment_date DESC);

-- TABLE 4: Finance Cash Transactions (Kas Komunitas)
CREATE TABLE IF NOT EXISTS finance_cash_transactions (
  id TEXT PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  finance_event_id TEXT,
  reference_id TEXT,
  recorded_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_cash_transactions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_cash_date ON finance_cash_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_cash_type ON finance_cash_transactions(type);

-- TABLE 5: Finance Audit Log
CREATE TABLE IF NOT EXISTS finance_audit_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT DEFAULT 'admin',
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_audit_log DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_finance_audit_table ON finance_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_finance_audit_record ON finance_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_time ON finance_audit_log(performed_at DESC);

-- ============================================================
-- END OF MIGRATION
-- ============================================================
