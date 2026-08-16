import type { Database as SqliteDatabase } from "better-sqlite3";
import { canonicalize } from "../../agent-authority/canonicalize.js";
import { sha256 } from "../../agent-authority/fingerprint.js";
import type { ApprovalStatus, ExecutionStatus, ProposalStatus, RiskClass, TargetKind } from "../../agent-authority/types.js";

export type ProposalRecord = {
  id: string; createdAt: string; expiresAt: string; status: ProposalStatus;
  targetKind: TargetKind; targetSystem: string; toolName: string; toolVersion: string;
  riskClass: RiskClass; argumentsJson: string; canonicalActionJson: string; actionHash: string;
  policyId: string; policyVersion: string; policyDecisionJson: string;
  preconditionJson: string; preconditionHash: string; requestContextJson: string;
  provenanceJson?: string; decidedAt?: string; decidedBy?: string; decisionReason?: string;
  consumedAt?: string; executionStatus?: ExecutionStatus; executionReceiptId?: string;
};
export type ApprovalRecord = {
  id: string; proposalId: string; actionHash: string; approverUser: string;
  approverSessionId?: string; issuedAt: string; expiresAt: string; nonce: string;
  status: ApprovalStatus; consumedAt?: string; reason?: string;
};
export type ReceiptRecord = {
  id: string; sequence: number; createdAt: string; proposalId?: string;
  receiptType: string; payloadJson: string; payloadHash: string; previousHash?: string;
  signatureAlgorithm?: string; signature?: string; signingKeyId?: string;
};

export function insertProposal(db: SqliteDatabase, p: ProposalRecord & { status: "pending" }): void {
  if (p.status !== "pending") throw new Error("NEW_PROPOSAL_MUST_BE_PENDING");
  db.prepare(`INSERT INTO agent_authority_proposals (
    id, created_at, expires_at, status, target_kind, target_system, tool_name, tool_version,
    risk_class, arguments_json, canonical_action_json, action_hash, policy_id, policy_version,
    policy_decision_json, precondition_json, precondition_hash, request_context_json, provenance_json,
    decided_at, decided_by, decision_reason, consumed_at, execution_status, execution_receipt_id
  ) VALUES (@id,@createdAt,@expiresAt,@status,@targetKind,@targetSystem,@toolName,@toolVersion,
    @riskClass,@argumentsJson,@canonicalActionJson,@actionHash,@policyId,@policyVersion,
    @policyDecisionJson,@preconditionJson,@preconditionHash,@requestContextJson,@provenanceJson,
    @decidedAt,@decidedBy,@decisionReason,@consumedAt,@executionStatus,@executionReceiptId)`)
    .run(nullable({ provenanceJson:null, decidedAt:null, decidedBy:null, decisionReason:null,
      consumedAt:null, executionStatus:null, executionReceiptId:null, ...p }));
}

export function getProposal(db: SqliteDatabase, id: string): ProposalRecord | undefined {
  const row = db.prepare("SELECT * FROM agent_authority_proposals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? proposalFromRow(row) : undefined;
}

export function listProposals(db:SqliteDatabase,input:{status?:ProposalStatus;limit:number}):ProposalRecord[] {
  const limit=Math.max(1,Math.min(100,Math.trunc(input.limit)));
  const rows=input.status
    ? db.prepare("SELECT * FROM agent_authority_proposals WHERE status=? ORDER BY created_at DESC,id DESC LIMIT ?").all(input.status,limit)
    : db.prepare("SELECT * FROM agent_authority_proposals ORDER BY created_at DESC,id DESC LIMIT ?").all(limit);
  return (rows as Record<string,unknown>[]).map(proposalFromRow);
}

export function getApprovalForProposal(db: SqliteDatabase, proposalId: string): ApprovalRecord | undefined {
  const row = db.prepare("SELECT * FROM agent_authority_approvals WHERE proposal_id = ?").get(proposalId) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id:row.id as string, proposalId:row.proposal_id as string, actionHash:row.action_hash as string,
    approverUser:row.approver_user as string, issuedAt:row.issued_at as string,
    expiresAt:row.expires_at as string, nonce:row.nonce as string, status:row.status as ApprovalStatus,
    ...optional(row,{approverSessionId:"approver_session_id",consumedAt:"consumed_at",reason:"reason"}),
  } as ApprovalRecord;
}

type PendingDecision = "approved" | "denied" | "expired" | "invalidated";

function transitionPendingProposal(db: SqliteDatabase, input: {
  id: string; to: PendingDecision; now: string; decidedBy?: string; reason?: string;
}): boolean {
  const expiryGuard = input.to === "approved" ? "AND expires_at > @now" : "";
  const result = db.prepare(`UPDATE agent_authority_proposals
    SET status=@to, decided_at=@now, decided_by=COALESCE(@decidedBy, decided_by),
        decision_reason=COALESCE(@reason, decision_reason)
    WHERE id=@id AND status='pending' ${expiryGuard}`)
    .run({ ...input, decidedBy: input.decidedBy ?? null, reason: input.reason ?? null });
  return result.changes === 1;
}

export function approveProposal(db: SqliteDatabase, id: string, now: string, decidedBy: string, reason?: string): boolean {
  return transitionPendingProposal(db, { id, to:"approved", now, decidedBy, reason });
}
export function denyProposal(db: SqliteDatabase, id: string, now: string, decidedBy: string, reason?: string): boolean {
  return transitionPendingProposal(db, { id, to:"denied", now, decidedBy, reason });
}
export function expireProposal(db: SqliteDatabase, id: string, now: string, reason?: string): boolean {
  return transitionPendingProposal(db, { id, to:"expired", now, reason });
}
export function invalidateProposal(db: SqliteDatabase, id: string, now: string, reason?: string): boolean {
  return transitionPendingProposal(db, { id, to:"invalidated", now, reason });
}

export function insertApproval(db: SqliteDatabase, a: ApprovalRecord & { status: "active" }): void {
  if (a.status !== "active") throw new Error("NEW_APPROVAL_MUST_BE_ACTIVE");
  db.prepare(`INSERT INTO agent_authority_approvals
    (id,proposal_id,action_hash,approver_user,approver_session_id,issued_at,expires_at,nonce,status,consumed_at,reason)
    VALUES (@id,@proposalId,@actionHash,@approverUser,@approverSessionId,@issuedAt,@expiresAt,@nonce,@status,@consumedAt,@reason)`)
    .run(nullable({ approverSessionId:null, consumedAt:null, reason:null, ...a }));
}

export function consumeBoundApproval(db: SqliteDatabase, proposalId: string, actionHash: string, now: string): boolean {
  return db.transaction(() => {
    const approval = db.prepare(`UPDATE agent_authority_approvals SET status='consumed', consumed_at=@now
      WHERE proposal_id=@proposalId AND action_hash=@actionHash AND status='active' AND expires_at>@now
        AND EXISTS (SELECT 1 FROM agent_authority_proposals p
          WHERE p.id=@proposalId AND p.status='approved' AND p.expires_at>@now AND p.action_hash=@actionHash)`)
      .run({ proposalId, actionHash, now });
    if (approval.changes !== 1) return false;
    const proposal = db.prepare(`UPDATE agent_authority_proposals SET status='consumed', consumed_at=@now
      WHERE id=@proposalId AND status='approved' AND expires_at>@now AND action_hash=@actionHash`)
      .run({ proposalId, actionHash, now });
    if (proposal.changes !== 1) throw new Error("APPROVAL_CONSUMPTION_CONFLICT");
    return true;
  }).immediate();
}

export function finalizeProposalExecution(
  db: SqliteDatabase,
  proposalId: string,
  status: ExecutionStatus,
  receiptId: string,
): boolean {
  const result = db.prepare(`UPDATE agent_authority_proposals
    SET execution_status=@status, execution_receipt_id=@receiptId
    WHERE id=@proposalId AND status='consumed' AND execution_status IS NULL`)
    .run({ proposalId, status, receiptId });
  return result.changes === 1;
}

export function listReceipts(db: SqliteDatabase): ReceiptRecord[] {
  return (db.prepare("SELECT * FROM agent_authority_receipts ORDER BY sequence").all() as Record<string, unknown>[]).map(receiptFromRow);
}

export function getReceipt(db:SqliteDatabase,id:string):ReceiptRecord|undefined {
  const row=db.prepare("SELECT * FROM agent_authority_receipts WHERE id=?").get(id) as Record<string,unknown>|undefined;
  return row?receiptFromRow(row):undefined;
}

export function listReceiptsBounded(db:SqliteDatabase,input:{limit:number;afterSequence?:number}):ReceiptRecord[] {
  const limit=Math.max(1,Math.min(100,Math.trunc(input.limit)));
  const after=Math.max(0,Math.trunc(input.afterSequence??0));
  return (db.prepare("SELECT * FROM agent_authority_receipts WHERE sequence>? ORDER BY sequence LIMIT ?").all(after,limit) as Record<string,unknown>[]).map(receiptFromRow);
}

export function listReceiptIdsForProposal(db:SqliteDatabase,proposalId:string):string[] {
  return (db.prepare("SELECT id FROM agent_authority_receipts WHERE proposal_id=? ORDER BY sequence").all(proposalId) as {id:string}[]).map((row)=>row.id);
}

export type ReceiptAppendInput = Omit<ReceiptRecord, "sequence" | "previousHash" | "payloadHash">;

export function receiptIntegrityMaterial(receipt: Pick<ReceiptRecord, "id" | "sequence" | "createdAt" | "receiptType" | "payloadJson"> & { proposalId?: string }): Record<string, unknown> {
  return {
    receipt_id: receipt.id,
    sequence: receipt.sequence,
    created_at: receipt.createdAt,
    proposal_id: receipt.proposalId ?? null,
    receipt_type: receipt.receiptType,
    payload: JSON.parse(receipt.payloadJson) as unknown,
  };
}

export function appendReceipt(db: SqliteDatabase, receipt: ReceiptAppendInput): ReceiptRecord {
  return db.transaction(() => {
    db.prepare(`INSERT OR IGNORE INTO agent_authority_chain_state(chain_id,last_sequence,last_hash,updated_at)
      VALUES ('default',0,NULL,@updatedAt)`).run({ updatedAt: receipt.createdAt });
    const head = db.prepare("SELECT last_sequence, last_hash FROM agent_authority_chain_state WHERE chain_id='default'").get() as { last_sequence: number; last_hash: string | null };
    const sequence = head.last_sequence + 1;
    const material = receiptIntegrityMaterial({ ...receipt, sequence });
    const stored: ReceiptRecord = { ...receipt, sequence, payloadHash: sha256(canonicalize(material)),
      ...(head.last_hash ? { previousHash: head.last_hash } : {}) };
    db.prepare(`INSERT INTO agent_authority_receipts
      (id,sequence,created_at,proposal_id,receipt_type,payload_json,payload_hash,previous_hash,signature_algorithm,signature,signing_key_id)
      VALUES (@id,@sequence,@createdAt,@proposalId,@receiptType,@payloadJson,@payloadHash,@previousHash,@signatureAlgorithm,@signature,@signingKeyId)`)
      .run(nullable({ proposalId:null, previousHash:null, signatureAlgorithm:null, signature:null, signingKeyId:null, ...stored }));
    db.prepare(`UPDATE agent_authority_chain_state SET last_sequence=@sequence,last_hash=@payloadHash,updated_at=@createdAt WHERE chain_id='default'`).run(stored);
    return stored;
  })();
}

function nullable<T extends object>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item ?? null]));
}
function proposalFromRow(r: Record<string, unknown>): ProposalRecord {
  return { id:r.id as string, createdAt:r.created_at as string, expiresAt:r.expires_at as string, status:r.status as ProposalStatus,
    targetKind:r.target_kind as TargetKind, targetSystem:r.target_system as string, toolName:r.tool_name as string, toolVersion:r.tool_version as string,
    riskClass:r.risk_class as RiskClass, argumentsJson:r.arguments_json as string, canonicalActionJson:r.canonical_action_json as string,
    actionHash:r.action_hash as string, policyId:r.policy_id as string, policyVersion:r.policy_version as string,
    policyDecisionJson:r.policy_decision_json as string, preconditionJson:r.precondition_json as string,
    preconditionHash:r.precondition_hash as string, requestContextJson:r.request_context_json as string,
    ...optional(r, { provenanceJson:"provenance_json", decidedAt:"decided_at", decidedBy:"decided_by", decisionReason:"decision_reason", consumedAt:"consumed_at", executionStatus:"execution_status", executionReceiptId:"execution_receipt_id" }) } as ProposalRecord;
}
function receiptFromRow(r: Record<string, unknown>): ReceiptRecord {
  return { id:r.id as string, sequence:r.sequence as number, createdAt:r.created_at as string, receiptType:r.receipt_type as string,
    payloadJson:r.payload_json as string, payloadHash:r.payload_hash as string,
    ...optional(r, { proposalId:"proposal_id", previousHash:"previous_hash", signatureAlgorithm:"signature_algorithm", signature:"signature", signingKeyId:"signing_key_id" }) } as ReceiptRecord;
}
function optional(row: Record<string, unknown>, map: Record<string,string>): Record<string,string> {
  return Object.fromEntries(Object.entries(map).flatMap(([out,input]) => typeof row[input] === "string" ? [[out,row[input] as string]] : []));
}
