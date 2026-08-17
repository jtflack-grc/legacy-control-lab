import { canonicalize } from "../canonicalize.js";
import { fingerprint, sha256 } from "../fingerprint.js";
import { PROOF_BUNDLE_SCHEMA, type AgentAuthorityProofBundleV1, type PortableReceipt } from "./proofBundle.js";

export type ProofVerificationResult={ok:boolean;schema:string|null;bundleId:string|null;checkedReceipts:number;errors:string[];reconstructedHeadHash:string|null};

export function proofBundleIntegrityMaterial(bundle:AgentAuthorityProofBundleV1):Omit<AgentAuthorityProofBundleV1,"bundleHash"> {
  const {bundleHash:_,...material}=bundle;return material;
}
export function calculateProofBundleHash(bundle:AgentAuthorityProofBundleV1):string {return sha256(canonicalize(proofBundleIntegrityMaterial(bundle)));}

/** Defensive, database-free verification of a parsed portable proof bundle. */
export function verifyProofBundle(input:unknown):ProofVerificationResult {
  const errors:string[]=[];
  if(!isRecord(input))return result(null,null,0,["bundle must be a JSON object"],null);
  const schema=string(input.schema);const bundleId=string(input.bundleId);
  if(schema!==PROOF_BUNDLE_SCHEMA)errors.push("unsupported proof-bundle schema");
  if(!bundleId)errors.push("bundleId is required");
  if(!isRecord(input.proposal)||!Array.isArray(input.receipts)||!isRecord(input.chainHead)||!isRecord(input.evidence))
    return result(schema,bundleId,0,[...errors,"bundle structure is incomplete"],null);
  if(!isRecord(input.proposal.canonicalAction)||!isRecord(input.proposal.precondition)||!isRecord(input.target)||!Array.isArray(input.proposal.receiptIds)||
    !Array.isArray(input.evidence.stateChanges)||!Array.isArray(input.evidence.generatedAudit)||!Array.isArray(input.evidence.jobLog)||!Array.isArray(input.evidence.evidenceTags))
    return result(schema,bundleId,input.receipts.length,[...errors,"bundle nested structure is incomplete"],null);
  const bundle=input as unknown as AgentAuthorityProofBundleV1;
  let head:string|null=null;
  try {
  try {if(calculateProofBundleHash(bundle)!==bundle.bundleHash)errors.push("bundle hash mismatch");} catch {errors.push("bundle integrity material is not canonicalizable");}
  const proposal=bundle.proposal;
  if(bundle.selectedProposalId!==proposal.id)errors.push("selected proposal ID mismatch");
  try {if(fingerprint(proposal.canonicalAction).hash!==proposal.actionHash)errors.push("canonical action hash mismatch");} catch {errors.push("canonical action is not canonicalizable");}
  try {if(fingerprint(proposal.precondition.material).hash!==proposal.precondition.hash)errors.push("precondition hash mismatch");} catch {errors.push("precondition is not canonicalizable");}
  if(proposal.canonicalAction.target_kind!==bundle.target.kind||proposal.canonicalAction.target_system!==bundle.target.system)errors.push("target does not match canonical action");
  head=verifyPortableReceipts(bundle.receipts,errors);
  if(bundle.chainHead.sequence!==bundle.receipts.length||bundle.chainHead.hash!==head)errors.push("exported chain head mismatch");
  const receiptIds=new Set(bundle.receipts.map((r)=>r.id));
  if(receiptIds.size!==bundle.receipts.length)errors.push("duplicate receipt ID");
  for(const id of proposal.receiptIds)if(!receiptIds.has(id))errors.push(`proposal receipt is missing: ${id}`);
  const direct=bundle.receipts.filter((r)=>r.proposalId===proposal.id).map((r)=>r.id);
  if(direct.length!==proposal.receiptIds.length||direct.some((id)=>!proposal.receiptIds.includes(id)))errors.push("proposal receipt ID manifest mismatch");
  verifyProposalReceipt(bundle,errors);verifyApproval(bundle,errors);verifyExecutionReceipt(bundle,errors);verifyDecisionSemantics(bundle,errors);verifyEvidence(bundle,errors);verifyOutcome(bundle,errors);
  if(!isRecord(bundle.exportVerification)||bundle.exportVerification.ok!==true||bundle.exportVerification.checkedReceipts!==bundle.receipts.length)errors.push("export-time verification metadata is inconsistent");
  } catch(error) {errors.push(`malformed proof field: ${error instanceof Error?error.message:"unknown"}`);}
  return result(schema,bundleId,bundle.receipts.length,errors,head);
}

function verifyPortableReceipts(receipts:AgentAuthorityProofBundleV1["receipts"],errors:string[]):string|null {
  let previous:string|null=null;
  for(let i=0;i<receipts.length;i++){
    const r=receipts[i] as PortableReceipt;if(!isRecord(r)){errors.push(`receipt ${i+1} is malformed`);continue;}
    if(r.sequence!==i+1)errors.push(`receipt sequence mismatch at index ${i}`);
    if(r.previousHash!==previous)errors.push(`receipt previousHash mismatch at sequence ${r.sequence}`);
    try {const material={receipt_id:r.id,sequence:r.sequence,created_at:r.createdAt,proposal_id:r.proposalId,receipt_type:r.receiptType,payload:r.payload};if(sha256(canonicalize(material))!==r.payloadHash)errors.push(`receipt integrity hash mismatch at sequence ${r.sequence}`);}catch{errors.push(`receipt payload is not canonicalizable at sequence ${r.sequence}`);}
    previous=r.payloadHash;
  }
  return previous;
}
function verifyProposalReceipt(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {
  const {proposal}=bundle;const receipts=directOfType(bundle,"approval_required");
  if(receipts.length!==1){errors.push("proposal must have exactly one approval_required receipt");return;}
  const payload=recordPayload(receipts[0]!,"approval_required",errors);if(!payload)return;
  compare(payload.request,proposal.requester,"proposal requester does not match approval_required receipt",errors);
  compare(payload.action,proposal.canonicalAction,"proposal action does not match approval_required receipt",errors);
  if(payload.action_hash!==proposal.actionHash)errors.push("proposal action hash does not match approval_required receipt");
  const policy=isRecord(payload.policy)?payload.policy:null;
  if(!policy)errors.push("approval_required policy is malformed");else {
    compare({id:policy.policyId,version:policy.policyVersion,decision:policy.decision,matchedRuleIds:policy.matchedRuleIds??[]},proposal.policy,"proposal policy does not match approval_required receipt",errors);
    if(policy.risk_class!==proposal.riskClass)errors.push("proposal risk class does not match approval_required receipt");
  }
  compare(payload.provenance??[],proposal.provenance,"proposal provenance does not match approval_required receipt",errors);
  const precondition=isRecord(payload.precondition)?payload.precondition:null;
  if(!precondition)errors.push("approval_required precondition is malformed");else {
    if(precondition.digest!==proposal.precondition.hash)errors.push("proposal precondition hash does not match approval_required receipt");
    compare(precondition.summary,proposal.precondition.material,"proposal precondition material does not match approval_required receipt",errors);
  }
  if(payload.expires_at!==proposal.expiresAt)errors.push("proposal expiry does not match approval_required receipt");
}
function verifyApproval(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {const a=bundle.proposal.approval;if(!a)return;if(!isRecord(a)){errors.push("approval metadata is malformed");return;}if(a.proposalId!==bundle.proposal.id)errors.push("approval proposal binding mismatch");if(a.actionHash!==bundle.proposal.actionHash)errors.push("approval action hash mismatch");}
function verifyExecutionReceipt(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {
  const {proposal}=bundle;const execution=proposal.execution;if(!execution)return;if(!isRecord(execution)){errors.push("execution metadata is malformed");return;}
  const receipt=bundle.receipts.find((r)=>r.id===execution.receiptId);if(!receipt){errors.push("execution receipt is missing");return;}
  if(receipt.proposalId!==proposal.id)errors.push("execution receipt proposal mismatch");if(receipt.receiptType!==`execution_${execution.status}`)errors.push("execution receipt type mismatch");
  const payload=recordPayload(receipt,"execution",errors);if(!payload)return;
  if(payload.action_hash!==proposal.actionHash)errors.push("execution receipt action hash mismatch");
  compare(payload.action,proposal.canonicalAction,"execution action does not match receipt",errors);
  if(payload.precondition_hash!==proposal.precondition.hash)errors.push("execution precondition hash mismatch");
  const policy=isRecord(payload.policy)?payload.policy:null;if(!policy)errors.push("execution policy is malformed");else compare({id:policy.policyId,version:policy.policyVersion,decision:policy.decision,matchedRuleIds:policy.matchedRuleIds??[]},proposal.policy,"execution policy does not match receipt",errors);
  compare(payload.provenance??[],proposal.provenance,"execution provenance does not match receipt",errors);
  const outcome=isRecord(payload.execution)?payload.execution:null;if(!outcome)errors.push("execution receipt outcome is malformed");else {if(outcome.status!==execution.status)errors.push("execution receipt status mismatch");compare(outcome.before,execution.before,"execution before state does not match receipt",errors);compare(outcome.after,execution.after,"execution after state does not match receipt",errors);}
  if(!isRecord(payload.executor)||payload.executor.user!==execution.actor||payload.executor.attempt_id!==execution.attemptId)errors.push("execution receipt executor mismatch");
  compare(payload.system_evidence??[],execution.evidenceRefs,"execution evidence references do not match receipt",errors);
  const approval=proposal.approval;const receiptApproval=isRecord(payload.approval)?payload.approval:null;const human=isRecord(payload.human_approver)?payload.human_approver:null;
  if(!approval||!receiptApproval||!human)errors.push("execution receipt approval metadata is incomplete");else {
    if(receiptApproval.id!==approval.id)errors.push("execution receipt approval ID mismatch");
    if(human.user!==approval.approverUser)errors.push("execution receipt approver user mismatch");
    if(human.session_id!==approval.approverSessionId)errors.push("execution receipt approver session mismatch");
    if(receiptApproval.consumed_at!==approval.consumedAt)errors.push("execution receipt approval consumed time mismatch");
  }
}
function verifyDecisionSemantics(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {
  const {proposal}=bundle;const decision=proposal.humanDecision;if(!isRecord(decision)){errors.push("human decision metadata is malformed");return;}
  const denial=directOfType(bundle,"human_denial"),expiry=directOfType(bundle,"proposal_expired"),invalidations=bundle.receipts.filter((r)=>r.proposalId===proposal.id&&["proposal_invalidated","target_precondition_failure","stale_precondition"].includes(r.receiptType));
  const decisionReceipts=denial.length+expiry.length+invalidations.length;
  if(proposal.status==="pending"){
    if(decision.decision!=="none"||decisionReceipts||proposal.approval||proposal.execution)errors.push("pending proposal has inconsistent decision state");return;
  }
  if(proposal.status==="denied"){
    if(decision.decision!=="denied"||denial.length!==1||expiry.length||invalidations.length||proposal.approval||proposal.execution)errors.push("denied proposal has inconsistent decision state");
    const payload=denial.length===1?recordPayload(denial[0]!,"human_denial",errors):null;if(payload){if(payload.proposal_id!==proposal.id||payload.action_hash!==proposal.actionHash)errors.push("denial receipt proposal/action mismatch");if(payload.denied_by!==decision.by)errors.push("denial user does not match receipt");compare(payload.reason??null,decision.reason,"denial reason does not match receipt",errors);compare(payload.provenance??[],proposal.provenance,"denial provenance does not match receipt",errors);}return;
  }
  if(proposal.status==="expired"){
    if(decision.decision!=="expired"||expiry.length!==1||denial.length||invalidations.length||proposal.approval||proposal.execution)errors.push("expired proposal has inconsistent decision state");
    const payload=expiry.length===1?recordPayload(expiry[0]!,"proposal_expired",errors):null;if(payload){if(payload.proposal_id!==proposal.id)errors.push("expiry receipt proposal mismatch");if(payload.decided_by!==undefined&&payload.decided_by!==decision.by)errors.push("expiry decision user does not match receipt");}return;
  }
  if(proposal.status==="invalidated"){
    if(decision.decision!=="invalidated"||invalidations.length!==1||denial.length||expiry.length||proposal.approval||proposal.execution)errors.push("invalidated proposal has inconsistent decision state");
    if(invalidations.length===1){const receipt=invalidations[0]!,payload=recordPayload(receipt,receipt.receiptType,errors);if(payload){if(payload.proposal_id!==proposal.id)errors.push("invalidation receipt proposal mismatch");if(payload.action_hash!==undefined&&payload.action_hash!==proposal.actionHash)errors.push("invalidation receipt action mismatch");const expected=receipt.receiptType==="stale_precondition"?"stale_precondition":receipt.receiptType==="target_precondition_failure"?"target_precondition_unavailable":typeof payload.reason==="string"?payload.reason.toLowerCase():null;if(expected!==decision.reason)errors.push("invalidation reason does not match receipt");}}return;
  }
  if(proposal.status==="approved"||proposal.status==="consumed"){
    if(decision.decision!=="approved"||denial.length||expiry.length||invalidations.length||!proposal.approval)errors.push("approved proposal has inconsistent human decision state");
    if(proposal.approval&&decision.by!==proposal.approval.approverUser)errors.push("approved decision user does not match approval");
    if(proposal.approval&&decision.reason!==proposal.approval.reason)errors.push("approved decision reason does not match approval");
    if(proposal.status==="consumed"&&!proposal.execution)errors.push("consumed proposal lacks execution outcome");return;
  }
  errors.push("unsupported proposal decision state");
}
function verifyEvidence(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {const execution=bundle.proposal.execution;if(!execution)return;const evidence=bundle.evidence;const collections:Record<string,string[]>={runtime_state_change:evidence.stateChanges.map((x)=>x.id),runtime_generated_audit:evidence.generatedAudit.map((x)=>x.id),runtime_job_log_entry:evidence.jobLog.map((x)=>x.id),evidence_tag:evidence.evidenceTags};for(const [kind,ids] of Object.entries(collections))if(new Set(ids).size!==ids.length)errors.push(`duplicate ${kind} evidence record`);const refKeys=new Set<string>();for(const ref of execution.evidenceRefs){const key=`${ref.type}\0${ref.id}`;if(refKeys.has(key))errors.push(`duplicate execution evidence reference: ${ref.type}:${ref.id}`);refKeys.add(key);if(!collections[ref.type]?.includes(ref.id))errors.push(`execution evidence reference is missing: ${ref.type}:${ref.id}`);}if(evidence.missionAttempt?.id!==execution.attemptId)errors.push("mission attempt does not match execution");for(const records of [evidence.stateChanges,evidence.generatedAudit,evidence.jobLog])for(const record of records)if(record.attemptId!==execution.attemptId)errors.push(`evidence attempt mismatch: ${record.id}`);}
function verifyOutcome(bundle:AgentAuthorityProofBundleV1,errors:string[]):void {const {proposal}=bundle;const execution=proposal.execution;const approval=proposal.approval;if(proposal.status==="denied"&&execution?.status==="succeeded")errors.push("denied proposal claims successful execution");if(proposal.status==="pending"&&approval?.status==="consumed")errors.push("pending proposal has consumed approval");if((proposal.status==="invalidated"||proposal.humanDecision.decision==="invalidated")&&execution?.status==="succeeded")errors.push("invalidated proposal claims successful execution");if(execution?.status==="succeeded"){if(proposal.status!=="consumed")errors.push("successful execution requires consumed proposal");if(approval?.status!=="consumed")errors.push("successful execution requires consumed approval");if(execution.actor!=="MCPAGENT")errors.push("successful LCL execution actor must be MCPAGENT");for(const kind of ["runtime_state_change","runtime_generated_audit","runtime_job_log_entry"] as const)if(!execution.evidenceRefs.some((r)=>r.type===kind))errors.push(`successful execution lacks ${kind} evidence`);}if(proposal.status==="consumed"&&!execution)errors.push("consumed proposal lacks execution outcome");}
function directOfType(bundle:AgentAuthorityProofBundleV1,type:string):PortableReceipt[]{return bundle.receipts.filter((r)=>r.proposalId===bundle.proposal.id&&r.receiptType===type);}
function recordPayload(receipt:PortableReceipt,label:string,errors:string[]):Record<string,any>|null {if(!isRecord(receipt.payload)){errors.push(`${label} receipt payload is malformed`);return null;}return receipt.payload;}
function compare(left:unknown,right:unknown,message:string,errors:string[]):void {try {if(canonicalize(left)!==canonicalize(right))errors.push(message);}catch{errors.push(`${message} (malformed value)`);}}
function result(schema:string|null,bundleId:string|null,checkedReceipts:number,errors:string[],head:string|null):ProofVerificationResult{return {ok:errors.length===0,schema,bundleId,checkedReceipts,errors,reconstructedHeadHash:head};}
function isRecord(value:unknown):value is Record<string,any>{return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
function string(value:unknown):string|null{return typeof value==="string"?value:null;}
