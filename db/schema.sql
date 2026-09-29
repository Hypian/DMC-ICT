CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  mis_claim_id TEXT,
  patient_ref TEXT,
  insurer_id TEXT,
  service_date TIMESTAMPTZ,
  service_codes JSONB DEFAULT '[]'::jsonb,
  diagnosis_codes JSONB DEFAULT '[]'::jsonb,
  amount NUMERIC(12,2) DEFAULT 0,
  pre_auth_ref TEXT,
  pulled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'clean',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS claim_flags (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  rule_id TEXT,
  field TEXT,
  reason_text TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL DEFAULT 'mis'
);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  insurer_id TEXT,
  rule_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS review_actions (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  rule_id TEXT,
  field TEXT,
  reason TEXT,
  severity TEXT,
  action TEXT NOT NULL,
  status TEXT,
  staff_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_insurer ON claims(insurer_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_claim ON audit_log(claim_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_claim ON review_actions(claim_id);
