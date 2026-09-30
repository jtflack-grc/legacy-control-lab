import type { Database as SqliteDatabase } from "better-sqlite3";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import { sessionLane } from "../../ibmi-runtime/sessionLane.js";
import { canonicalize } from "../canonicalize.js";
import { fingerprint } from "../fingerprint.js";
import { createReceipt } from "../evidence/receiptIntegrity.js";
import { authorityToolRegistry, type ToolRegistry } from "../toolRegistry.js";
import type { CanonicalAction, Clock, ExecutionStatus, IdGenerator } from "../types.js";
import type { TargetAdapter, TargetMutationResult } from "../adapters/targetAdapter.js";
import {
  approveProposal as approvePendingProposal, consumeBoundApproval, denyProposal as denyPendingProposal,
  expireProposal, finalizeProposalExecution, getApprovalForProposal, getProposal, insertApproval, invalidateProposal,
} from "../../db/repositories/agentAuthorityRepository.js";

export type ApprovalDecisionResult =
  | {status:ExecutionStatus;proposalId:string;receiptId:string;execution?:TargetMutationResult}
  | {status:"denied"|"expired"|"invalidated"|"rejected";proposalId:string;receiptId?:string;reason:string};

export class OperatorApprovalService {
  constructor(private readonly deps:{db:SqliteDatabase;adapter:TargetAdapter;clock:Clock;ids:IdGenerator;registry?:ToolRegistry}) {}

  deny(proposalId:string,session:IbmiSession,reason?:string):ApprovalDecisionResult {
    const proposal=this.requireProposal(proposalId);
    if (!this.isAuthorizedOperator(session,proposal.targetSystem)) return {status:"rejected",proposalId,reason:"APPROVER_NOT_AUTHORIZED"};
    const now=this.deps.clock.now().toISOString();
    if (proposal.status!=="pending") return {status:"rejected",proposalId,reason:"PROPOSAL_ALREADY_DECIDED"};
    if (proposal.expiresAt<=now) {
      expireProposal(this.deps.db,proposalId,now,"proposal_ttl_elapsed");
      const receipt=createReceipt(this.deps.db,this.deps,{type:"proposal_expired",proposalId,payload:{proposal_id:proposalId,decided_by:session.userName}});
      return {status:"expired",proposalId,receiptId:receipt.id,reason:"PROPOSAL_EXPIRED"};
    }
    if (!denyPendingProposal(this.deps.db,proposalId,now,session.userName!,reason)) return {status:"rejected",proposalId,reason:"PROPOSAL_ALREADY_DECIDED"};
    const receipt=createReceipt(this.deps.db,this.deps,{type:"human_denial",proposalId,payload:{proposal_id:proposalId,action_hash:proposal.actionHash,
      denied_by:session.userName,reason:reason??null,provenance:proposal.provenanceJson?JSON.parse(proposal.provenanceJson):[]}});
    return {status:"denied",proposalId,receiptId:receipt.id,reason:"HUMAN_DENIED"};
  }

  approve(proposalId:string,session:IbmiSession,reason?:string):ApprovalDecisionResult {
    const initial=this.requireProposal(proposalId);
    if (!this.isAuthorizedOperator(session,initial.targetSystem)) return {status:"rejected",proposalId,reason:"APPROVER_NOT_AUTHORIZED"};
    return this.deps.db.transaction(() => this.approveProtected(proposalId,session,reason)).immediate();
  }

  private approveProtected(proposalId:string,session:IbmiSession,reason?:string):ApprovalDecisionResult {
    const proposal=this.requireProposal(proposalId);
    const now=this.deps.clock.now().toISOString();
    if (proposal.status!=="pending") return {status:"rejected",proposalId,reason:"PROPOSAL_ALREADY_DECIDED"};
    if (proposal.expiresAt<=now) {
      expireProposal(this.deps.db,proposalId,now,"proposal_ttl_elapsed");
      const receipt=createReceipt(this.deps.db,this.deps,{type:"proposal_expired",proposalId,payload:{proposal_id:proposalId,decided_by:session.userName}});
      return {status:"expired",proposalId,receiptId:receipt.id,reason:"PROPOSAL_EXPIRED"};
    }
    let action:CanonicalAction;
    try {
      action=JSON.parse(proposal.canonicalActionJson) as CanonicalAction;
      if (canonicalize(action)!==proposal.canonicalActionJson||fingerprint(action).hash!==proposal.actionHash) throw new Error("ACTION_HASH_MISMATCH");
      (this.deps.registry??authorityToolRegistry).require(proposal.toolName,proposal.toolVersion);
    } catch {
      invalidateProposal(this.deps.db,proposalId,now,"action_or_tool_invalid");
      const receipt=createReceipt(this.deps.db,this.deps,{type:"proposal_invalidated",proposalId,payload:{proposal_id:proposalId,reason:"ACTION_OR_TOOL_INVALID"}});
      return {status:"invalidated",proposalId,receiptId:receipt.id,reason:"ACTION_OR_TOOL_INVALID"};
    }
    let current:Record<string,unknown>;
    try { current=this.deps.adapter.snapshot(action); }
    catch (error) {
      const detail=error instanceof Error?error.message:String(error);
      invalidateProposal(this.deps.db,proposalId,now,"target_precondition_unavailable");
      const receipt=createReceipt(this.deps.db,this.deps,{type:"target_precondition_failure",proposalId,payload:{
        proposal_id:proposalId,action_hash:proposal.actionHash,reason:"TARGET_PRECONDITION_UNAVAILABLE",detail,
      }});
      return {status:"invalidated",proposalId,receiptId:receipt.id,reason:"TARGET_PRECONDITION_UNAVAILABLE"};
    }
    const currentIdentity=fingerprint(current);
    if (currentIdentity.hash!==proposal.preconditionHash) {
      invalidateProposal(this.deps.db,proposalId,now,"stale_precondition");
      const receipt=createReceipt(this.deps.db,this.deps,{type:"stale_precondition",proposalId,payload:{proposal_id:proposalId,action_hash:proposal.actionHash,expected:proposal.preconditionHash,current:currentIdentity.hash}});
      return {status:"invalidated",proposalId,receiptId:receipt.id,reason:"STALE_PRECONDITION"};
    }
    const approvalId=this.deps.ids.id("apr");
    const approved=approvePendingProposal(this.deps.db,proposalId,now,session.userName!,reason);
    if (!approved) return {status:"rejected",proposalId,reason:"PROPOSAL_ALREADY_DECIDED"};
    insertApproval(this.deps.db,{id:approvalId,proposalId,actionHash:proposal.actionHash,approverUser:session.userName!,approverSessionId:session.id,
      issuedAt:now,expiresAt:proposal.expiresAt,nonce:this.deps.ids.nonce(),status:"active",reason});
    if (!consumeBoundApproval(this.deps.db,proposalId,proposal.actionHash,now)) return {status:"rejected",proposalId,reason:"APPROVAL_CONSUMPTION_FAILED"};

    let execution:TargetMutationResult;
    try { execution=this.deps.adapter.executeMutation(action); }
    catch (error) { execution={status:"failed",actor:"MCPAGENT",attemptId:"unknown",before:{},after:{},evidence:[],error:error instanceof Error?error.message:String(error)}; }
    const finalStatus:ExecutionStatus=execution.status;
    const receiptId=this.deps.ids.id("rcpt");
    const approval=getApprovalForProposal(this.deps.db,proposalId);
    const receipt=this.deps.db.transaction(()=>{
      if (!finalizeProposalExecution(this.deps.db,proposalId,finalStatus,receiptId)) throw new Error("EXECUTION_ALREADY_FINALIZED");
      return createReceipt(this.deps.db,this.deps,{receiptId,type:`execution_${finalStatus}`,proposalId,payload:{
        request:JSON.parse(proposal.requestContextJson),human_approver:{user:session.userName,session_id:session.id},
        executor:{user:execution.actor,attempt_id:execution.attemptId},action:JSON.parse(proposal.canonicalActionJson),action_hash:proposal.actionHash,
        precondition_hash:proposal.preconditionHash,policy:JSON.parse(proposal.policyDecisionJson),approval:{id:approval?.id,consumed_at:approval?.consumedAt},
        provenance:proposal.provenanceJson?JSON.parse(proposal.provenanceJson):[],
        execution:{status:finalStatus,before:execution.before,after:execution.after,state_change_id:execution.stateChangeId??null,error:execution.error??null},
        system_evidence:execution.evidence,
      }});
    }).immediate();
    return {status:finalStatus,proposalId,receiptId:receipt.id,execution};
  }

  private requireProposal(id:string) { const proposal=getProposal(this.deps.db,id); if (!proposal) throw new Error("PROPOSAL_NOT_FOUND"); return proposal; }
  private isAuthorizedOperator(session:IbmiSession,system:string):boolean {
    return session.signedOn===true&&Boolean(session.userName)&&session.systemName===system&&sessionLane(session)==="operator";
  }
}
