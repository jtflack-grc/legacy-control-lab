import type { ActionContext, CanonicalAction, ExecutionStatus, ProvenanceRef, TargetKind } from "../types.js";

export type TargetReadResult = {
  data: unknown;
  provenance: ProvenanceRef[];
};

export type TargetEvidenceRef = {
  type: "runtime_state_change" | "runtime_generated_audit" | "runtime_job_log_entry" | "evidence_tag";
  id: string;
};

export type TargetMutationResult = {
  status: ExecutionStatus;
  actor: string;
  attemptId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  stateChangeId?: string;
  evidence: TargetEvidenceRef[];
  error?: string;
};

export interface TargetAdapter {
  readonly kind: TargetKind;
  readonly system: string;
  read(operation: string, args: Record<string, unknown>, context: ActionContext): TargetReadResult;
  snapshot(action: CanonicalAction): Record<string, unknown>;
  executeMutation(action: CanonicalAction): TargetMutationResult;
  collectEvidence(attemptId: string, stateChangeId: string): TargetEvidenceRef[];
}
