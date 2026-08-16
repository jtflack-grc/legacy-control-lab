export type TargetKind = "lcl" | "ibmi-mcp";
export type RiskClass =
  | "observe"
  | "privilege_change"
  | "configuration_change"
  | "operational_change"
  | "destructive";
export type PolicyDecision = "allow" | "require_approval" | "deny";
export type ProposalStatus =
  | "pending" | "approved" | "denied" | "expired" | "invalidated"
  | "consumed" | "failed" | "indeterminate";
export type ApprovalStatus = "active" | "consumed" | "expired" | "revoked";

export type ActionContext = {
  requestId: string;
  agentSessionId: string;
  clientName?: string;
  clientVersion?: string;
  actorType: "agent";
  requestedAt: string;
};

export type ProvenanceRef = {
  sourceId: string;
  sourceType: string;
  trustClass: "trusted_system" | "trusted_policy" | "untrusted_operational_data" | "unknown";
  contentHash?: string;
};

export type ActionRequest<TArgs extends Record<string, unknown> = Record<string, unknown>> = {
  schemaVersion: "1";
  target: { kind: TargetKind; system: string };
  tool: { name: string; version: string };
  arguments: TArgs;
  context: ActionContext;
  provenance?: ProvenanceRef[];
};

export type CanonicalAction = {
  schema_version: "1";
  target_kind: TargetKind;
  target_system: string;
  tool_name: string;
  tool_version: string;
  arguments: Record<string, unknown>;
};

export interface Clock { now(): Date }
export interface IdGenerator { id(prefix: string): string; nonce(): string }
