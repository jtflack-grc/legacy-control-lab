export type RuntimeEntityType =
  | "user_profile"
  | "system_value"
  | "object_authority"
  | "ifs_authority"
  | "spooled_file"
  | "library_list"
  | "job"
  | "message_queue"
  | "mission";

export type RuntimeSideEffectType =
  | "audit_journal_entry"
  | "job_log_entry"
  | "message_queue_entry"
  | "spooled_file"
  | "evidence_event"
  | "coach_event";

export type RuntimeSideEffect = {
  type: RuntimeSideEffectType;
  id: string;
};

export type MutationIntent = {
  commandText: string;
  mutationType: string;
  entityType: RuntimeEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  evidenceTags: string[];
  auditEntryType?: string;
  auditObjectRef?: string;
  auditMessage?: string;
  jobLogMessages?: string[];
  coachEventKey?: string;
};

export type CommandHistoryEntry = {
  id: string;
  attemptId: string;
  timestamp: string;
  userName: string;
  commandText: string;
  commandName: string;
  resultCode: string;
  resultMessage: string;
  screenId?: string;
  evidenceTags?: string[];
  mutationIds?: string[];
};

export type StateChange = {
  id: string;
  attemptId: string;
  timestamp: string;
  commandText: string;
  actor: string;
  entityType: RuntimeEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  sideEffects: RuntimeSideEffect[];
};

export type AttemptBaselineSnapshot = {
  userProfiles: Array<{
    userName: string;
    status: string;
    userClass: string;
    text: string;
    groupProfile: string | null;
    specialAuthorities: string | null;
    initialMenu: string | null;
  }>;
  systemValues: Array<{ name: string; value: string }>;
  objectPublicAuthorities: Array<{ library: string; object: string; publicAuth: string }>;
  objectAuthorities: Array<{ library: string; object: string; userName: string; authority: string }>;
  spooledFiles: Array<{ fileName: string; userName: string; spoolNumber: string; status: string }>;
  ifsLinks: Array<{
    directory: string;
    name: string;
    linkType: string;
    target: string;
    owner: string;
    dataAuthority: string;
    textDescription: string;
  }>;
  libraryList?: {
    system: string[];
    product: string[];
    current?: string;
    user: string[];
  };
};
