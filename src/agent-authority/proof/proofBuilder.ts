import type { Database as SqliteDatabase } from "better-sqlite3";
import { getApprovalForProposal, getProposal, listReceipts } from "../../db/repositories/agentAuthorityRepository.js";
import { listEvidenceTags, getMissionAttempt } from "../../db/repositories/missionRepository.js";
import { listGeneratedAudit, listRuntimeJobLog, listStateChanges } from "../../db/repositories/runtimeRepository.js";
import type { Clock, IdGenerator, PolicyDecision } from "../types.js";
import type { TargetEvidenceRef } from "../adapters/targetAdapter.js";
import { verifyReceiptChain } from "../evidence/receiptVerifier.js";
import { calculateProofBundleHash, verifyProofBundle } from "./proofVerifier.js";
import { PROOF_BUNDLE_SCHEMA, type AgentAuthorityProofBundleV1, type PortableExecution } from "./proofBundle.js";

export function buildProposalProofBundle(db:SqliteDatabase,proposalId:string,deps:{clock:Clock;ids:IdGenerator}):AgentAuthorityProofBundleV1 {
  const proposal=getProposal(db,proposalId);if(!proposal)throw new Error("PROPOSAL_NOT_FOUND");
  const chainVerification=verifyReceiptChain(db);if(!chainVerification.ok)throw new Error(`RECEIPT_CHAIN_INVALID:${chainVerification.errors.join(";")}`);
  const receipts=listReceipts(db).map((r)=>({id:r.id,sequence:r.sequence,createdAt:r.createdAt,proposalId:r.proposalId??null,receiptType:r.receiptType,payload:JSON.parse(r.payloadJson) as unknown,payloadHash:r.payloadHash,previousHash:r.previousHash??null}));
  const directReceipts=receipts.filter((r)=>r.proposalId===proposal.id);
  const executionReceipt=proposal.executionReceiptId?directReceipts.find((r)=>r.id===proposal.executionReceiptId):undefined;
  const execution=executionReceipt?executionFromReceipt(executionReceipt.payload,proposal.executionReceiptId!):null;
  const approval=getApprovalForProposal(db,proposal.id);
  const policy=JSON.parse(proposal.policyDecisionJson) as {decision:PolicyDecision;matchedRuleIds?:string[]};
  const request=JSON.parse(proposal.requestContextJson) as Record<string,unknown>;
  const attempt=execution?getMissionAttempt(execution.attemptId):undefined;
  const decision=decisionProjection(proposal,directReceipts);
  const bundle:AgentAuthorityProofBundleV1={
    schema:PROOF_BUNDLE_SCHEMA,bundleId:deps.ids.id("proof"),generatedAt:deps.clock.now().toISOString(),
    target:{kind:proposal.targetKind,system:proposal.targetSystem},selectedProposalId:proposal.id,
    proposal:{id:proposal.id,status:proposal.status,createdAt:proposal.createdAt,expiresAt:proposal.expiresAt,
      canonicalAction:JSON.parse(proposal.canonicalActionJson),actionHash:proposal.actionHash,riskClass:proposal.riskClass,
      policy:{id:proposal.policyId,version:proposal.policyVersion,decision:policy.decision,matchedRuleIds:policy.matchedRuleIds??[]},
      provenance:proposal.provenanceJson?JSON.parse(proposal.provenanceJson):[],precondition:{material:JSON.parse(proposal.preconditionJson),hash:proposal.preconditionHash},
      requester:{requestId:text(request.requestId),agentSessionId:text(request.agentSessionId),actorType:text(request.actorType),requestedAt:text(request.requestedAt),clientName:text(request.clientName),clientVersion:text(request.clientVersion)},
      humanDecision:decision,
      approval:approval?{id:approval.id,proposalId:approval.proposalId,actionHash:approval.actionHash,approverUser:approval.approverUser,approverSessionId:approval.approverSessionId??null,issuedAt:approval.issuedAt,expiresAt:approval.expiresAt,status:approval.status,consumedAt:approval.consumedAt??null,reason:approval.reason??null}:null,
      execution,receiptIds:directReceipts.map((r)=>r.id)},
    evidence:{missionAttempt:attempt?{id:attempt.id,missionId:attempt.missionId,systemId:attempt.systemId,userName:attempt.userName,startedAt:attempt.startedAt}:null,
      stateChanges:execution?listStateChanges(execution.attemptId):[],generatedAudit:execution?clean(listGeneratedAudit(execution.attemptId)):[],jobLog:execution?clean(listRuntimeJobLog(execution.attemptId)):[],evidenceTags:execution?listEvidenceTags(execution.attemptId):[]},
    receipts,chainHead:{sequence:receipts.length,hash:chainVerification.headHash??null},
    exportVerification:{ok:true,checkedReceipts:receipts.length,errors:[]},bundleHash:"",
  };
  bundle.bundleHash=calculateProofBundleHash(bundle);
  const verification=verifyProofBundle(bundle);if(!verification.ok)throw new Error(`PROOF_VERIFICATION_FAILED:${verification.errors.join(";")}`);
  return bundle;
}

function executionFromReceipt(payload:unknown,receiptId:string):PortableExecution {if(!record(payload)||!record(payload.execution)||!record(payload.executor))throw new Error("EXECUTION_RECEIPT_MALFORMED");const refs=Array.isArray(payload.system_evidence)?payload.system_evidence:[];return {status:payload.execution.status as PortableExecution["status"],actor:String(payload.executor.user),attemptId:String(payload.executor.attempt_id),receiptId,evidenceRefs:refs as TargetEvidenceRef[],before:record(payload.execution.before)?payload.execution.before:{},after:record(payload.execution.after)?payload.execution.after:{}};}
function humanDecision(status:string):AgentAuthorityProofBundleV1["proposal"]["humanDecision"]["decision"] {if(status==="consumed"||status==="approved")return "approved";if(status==="denied"||status==="expired"||status==="invalidated")return status;return "none";}
function decisionProjection(proposal:ReturnType<typeof getProposal> & {},receipts:Array<{receiptType:string;payload:unknown}>):AgentAuthorityProofBundleV1["proposal"]["humanDecision"] {
  let by=proposal.decidedBy??null;
  if(proposal.status==="expired"&&!by){const receipt=receipts.find((r)=>r.receiptType==="proposal_expired");if(record(receipt?.payload)&&typeof receipt.payload.decided_by==="string")by=receipt.payload.decided_by;}
  return {decision:humanDecision(proposal.status),at:proposal.decidedAt??null,by,reason:proposal.decisionReason??null};
}
function text(value:unknown):string|null{return typeof value==="string"?value:null;}
function record(value:unknown):value is Record<string,any>{return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
function clean<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
