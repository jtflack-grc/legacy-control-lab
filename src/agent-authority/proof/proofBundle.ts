import type { CanonicalAction, ExecutionStatus, PolicyDecision, ProposalStatus, ProvenanceRef, RiskClass, TargetKind } from "../types.js";
import type { TargetEvidenceRef } from "../adapters/targetAdapter.js";

export const PROOF_BUNDLE_SCHEMA="agent-authority-proof-bundle/v1" as const;

export type PortableReceipt={id:string;sequence:number;createdAt:string;proposalId:string|null;receiptType:string;payload:unknown;payloadHash:string;previousHash:string|null};
export type PortableApproval={id:string;proposalId:string;actionHash:string;approverUser:string;approverSessionId:string|null;issuedAt:string;expiresAt:string;status:string;consumedAt:string|null;reason:string|null};
export type PortableExecution={status:ExecutionStatus;actor:string;attemptId:string;receiptId:string;evidenceRefs:TargetEvidenceRef[];before:Record<string,unknown>;after:Record<string,unknown>};
export type PortableEvidence={
  missionAttempt:{id:string;missionId:string;systemId:string;userName:string;startedAt:string}|null;
  stateChanges:Array<{id:string;attemptId:string;timestamp:string;commandText:string;actor:string;entityType:string;entityId:string;before:Record<string,unknown>;after:Record<string,unknown>;sideEffects:Array<{type:string;id:string}>}>;
  generatedAudit:Array<{id:string;attemptId:string;entryTime:string;userName:string;entryType:string;objectRef:string;message?:string;sourceCommand?:string}>;
  jobLog:Array<{id:string;attemptId:string;timestamp:string;messageId?:string;messageText:string}>;
  evidenceTags:string[];
};

export type AgentAuthorityProofBundleV1={
  schema:typeof PROOF_BUNDLE_SCHEMA;
  bundleId:string;
  generatedAt:string;
  target:{kind:TargetKind;system:string};
  selectedProposalId:string;
  proposal:{
    id:string;status:ProposalStatus;createdAt:string;expiresAt:string;
    canonicalAction:CanonicalAction;actionHash:string;riskClass:RiskClass;
    policy:{id:string;version:string;decision:PolicyDecision;matchedRuleIds:string[]};
    provenance:ProvenanceRef[];precondition:{material:Record<string,unknown>;hash:string};
    requester:{requestId:string|null;agentSessionId:string|null;actorType:string|null;requestedAt:string|null;clientName:string|null;clientVersion:string|null};
    humanDecision:{decision:"none"|"approved"|"denied"|"expired"|"invalidated";at:string|null;by:string|null;reason:string|null};
    approval:PortableApproval|null;execution:PortableExecution|null;receiptIds:string[];
  };
  evidence:PortableEvidence;
  receipts:PortableReceipt[];
  chainHead:{sequence:number;hash:string|null};
  exportVerification:{ok:true;checkedReceipts:number;errors:[]};
  bundleHash:string;
};
