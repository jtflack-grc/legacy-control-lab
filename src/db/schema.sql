-- Legacy Control Lab scenario database (Phase 4)
-- The database is the fake machine's object catalog.

CREATE TABLE IF NOT EXISTS systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  user_name TEXT,
  signed_on INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL,
  user_class TEXT NOT NULL DEFAULT '*USER',
  text_description TEXT,
  group_profile TEXT,
  special_authorities TEXT,
  initial_menu TEXT,
  last_signon TEXT,
  password TEXT,
  activity_profile_exempt INTEGER NOT NULL DEFAULT 0,
  business_owner TEXT,
  limit_capabilities TEXT NOT NULL DEFAULT '*NO',
  UNIQUE (system_id, user_name),
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS libraries (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (system_id, name),
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  library TEXT NOT NULL,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL,
  owner TEXT,
  text_description TEXT,
  public_authority TEXT,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS system_values (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  UNIQUE (system_id, name),
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS audit_journal_entries (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  entry_time TEXT NOT NULL,
  user_name TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  object_ref TEXT,
  message TEXT,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  job_number TEXT NOT NULL,
  user_name TEXT NOT NULL,
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  subsystem TEXT NOT NULL,
  status TEXT NOT NULL,
  job_description TEXT,
  output_queue TEXT,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS spooled_files (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  spool_number TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  category TEXT,
  status TEXT NOT NULL,
  handler TEXT,
  allow_limited_user INTEGER NOT NULL DEFAULT 1,
  requires_authority TEXT
);

CREATE TABLE IF NOT EXISTS command_parameters (
  id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  name TEXT NOT NULL,
  param_type TEXT,
  default_value TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  supports_special_values TEXT,
  UNIQUE (command_id, name),
  FOREIGN KEY (command_id) REFERENCES commands(id)
);

CREATE INDEX IF NOT EXISTS idx_command_parameters_command ON command_parameters (command_id);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  briefing TEXT,
  system_id TEXT NOT NULL,
  persona TEXT,
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS mission_evidence_requirements (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  requirement_key TEXT NOT NULL,
  description TEXT NOT NULL,
  command_pattern TEXT NOT NULL,
  optional INTEGER NOT NULL DEFAULT 0,
  weight REAL NOT NULL DEFAULT 1,
  UNIQUE (mission_id, requirement_key),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS mission_expected_findings (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  finding_key TEXT NOT NULL,
  description TEXT NOT NULL,
  match_patterns TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  UNIQUE (mission_id, finding_key),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS mission_attempts (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  system_id TEXT NOT NULL,
  session_id TEXT,
  user_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  evidence_score REAL,
  issues_score REAL,
  interpretation_score REAL,
  finding_quality_score REAL,
  total_score REAL,
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE TABLE IF NOT EXISTS mission_evidence_collected (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  requirement_key TEXT NOT NULL,
  command_text TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  UNIQUE (attempt_id, requirement_key),
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  evidence_refs TEXT,
  control_mapping TEXT,
  finding_text TEXT,
  decision_impact TEXT,
  recommendation TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_mission ON mission_attempts (mission_id);
CREATE INDEX IF NOT EXISTS idx_findings_attempt ON findings (attempt_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_system ON user_profiles (system_id);
CREATE INDEX IF NOT EXISTS idx_objects_system ON objects (system_id);
CREATE INDEX IF NOT EXISTS idx_system_values_system ON system_values (system_id);
CREATE INDEX IF NOT EXISTS idx_audit_journal_system ON audit_journal_entries (system_id);
CREATE INDEX IF NOT EXISTS idx_spooled_files_system ON spooled_files (system_id);

CREATE TABLE IF NOT EXISTS object_authorities (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL,
  library TEXT NOT NULL,
  object_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  authority TEXT NOT NULL,
  UNIQUE (system_id, library, object_name, user_name),
  FOREIGN KEY (system_id) REFERENCES systems(id)
);

CREATE INDEX IF NOT EXISTS idx_object_authorities_system ON object_authorities (system_id);

CREATE TABLE IF NOT EXISTS runtime_command_history (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_name TEXT NOT NULL,
  command_text TEXT NOT NULL,
  command_name TEXT NOT NULL,
  result_code TEXT,
  result_message TEXT,
  screen_id TEXT,
  evidence_tags TEXT,
  mutation_ids TEXT,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS runtime_state_changes (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  command_text TEXT NOT NULL,
  actor TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  side_effects_json TEXT,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS runtime_attempt_baselines (
  attempt_id TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS runtime_generated_audit (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  entry_time TEXT NOT NULL,
  user_name TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  object_ref TEXT,
  message TEXT,
  source_command TEXT,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS runtime_job_log_entries (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  message_id TEXT,
  message_text TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS runtime_coach_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
);

CREATE TABLE IF NOT EXISTS agent_authority_proposals (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_system TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_version TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  arguments_json TEXT NOT NULL,
  canonical_action_json TEXT NOT NULL,
  action_hash TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_decision_json TEXT NOT NULL,
  precondition_json TEXT NOT NULL,
  precondition_hash TEXT NOT NULL,
  request_context_json TEXT NOT NULL,
  provenance_json TEXT,
  decided_at TEXT,
  decided_by TEXT,
  decision_reason TEXT,
  consumed_at TEXT,
  execution_status TEXT,
  execution_receipt_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_auth_proposals_status
  ON agent_authority_proposals(status);
CREATE INDEX IF NOT EXISTS idx_agent_auth_proposals_expires
  ON agent_authority_proposals(expires_at);

CREATE TABLE IF NOT EXISTS agent_authority_approvals (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL UNIQUE,
  action_hash TEXT NOT NULL,
  approver_user TEXT NOT NULL,
  approver_session_id TEXT,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  consumed_at TEXT,
  reason TEXT,
  FOREIGN KEY (proposal_id) REFERENCES agent_authority_proposals(id)
);

CREATE TABLE IF NOT EXISTS agent_authority_receipts (
  id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  proposal_id TEXT,
  receipt_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  previous_hash TEXT,
  signature_algorithm TEXT,
  signature TEXT,
  signing_key_id TEXT,
  FOREIGN KEY (proposal_id) REFERENCES agent_authority_proposals(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_auth_receipts_proposal
  ON agent_authority_receipts(proposal_id);

CREATE TABLE IF NOT EXISTS agent_authority_chain_state (
  chain_id TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL,
  last_hash TEXT,
  updated_at TEXT NOT NULL
);
