import { getDatabase } from "../../db/sqlite.js";
import { listObjectAuthorities } from "../../db/repositories/objectAuthorityRepository.js";
import { getProposal } from "../../db/repositories/agentAuthorityRepository.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import type { AuthorityBroker } from "../broker/authorityBroker.js";
import type { OperatorApprovalService } from "../broker/operatorApprovalService.js";
import type { TargetEvidenceRef } from "../adapters/targetAdapter.js";
import type { ActionContext, CanonicalAction, ExecutionStatus, PolicyDecision, ProvenanceRef, RiskClass } from "../types.js";
import { AA001_INTENT, AA001_MESSAGE, AA001_SCENARIO_ID } from "./aa001Fixture.js";

export type AA001ScenarioResult = {
  scenarioId:typeof AA001_SCENARIO_ID;
  mode:"control_present"|"synthetic_counterfactual";
  governanceControlPresent:boolean;
  messageSources:ProvenanceRef[];
  canonicalAction:CanonicalAction;
  actionHash:string;
  policy:{id:string;version:string;decision:PolicyDecision;riskClass:RiskClass;matchedRuleIds:string[]};
  proposalId:string|null;
  humanDecision:"none"|"denied"|"approved";
  humanApproved:boolean;
  executionStatus:ExecutionStatus|null;
  executionActor:string|null;
  resultingAuthority:string|null;
  evidenceRefs:TargetEvidenceRef[];
  receiptIds:string[];
};

/** Deterministic fixture follower: requests the structured intent but never manufactures approval. */
export class AA001DeterministicAgent {
  constructor(private readonly broker:AuthorityBroker,private readonly approvals:OperatorApprovalService) {}

  run(context:ActionContext):AA001ScenarioResult { return this.request(context); }
  runDenied(context:ActionContext,operator:IbmiSession,reason?:string):AA001ScenarioResult {
    const pending=this.request(context);
    const decision=this.approvals.deny(pending.proposalId!,operator,reason);
    if(decision.status!=="denied") throw new Error(`AA001_DENIAL_FAILED:${"reason" in decision?decision.reason:decision.status}`);
    return {...pending,humanDecision:"denied",resultingAuthority:this.currentAuthority(),receiptIds:[...pending.receiptIds,decision.receiptId!]};
  }
  runApproved(context:ActionContext,operator:IbmiSession,reason?:string):AA001ScenarioResult {
    const pending=this.request(context);
    const decision=this.approvals.approve(pending.proposalId!,operator,reason);
    if(decision.status!=="succeeded"&&decision.status!=="failed"&&decision.status!=="indeterminate")
      throw new Error(`AA001_APPROVAL_FAILED:${"reason" in decision?decision.reason:decision.status}`);
    return {...pending,humanDecision:"approved",humanApproved:true,executionStatus:decision.status,
      executionActor:decision.execution?.actor??null,resultingAuthority:this.currentAuthority(),
      evidenceRefs:decision.execution?.evidence??[],receiptIds:[...pending.receiptIds,decision.receiptId]};
  }

  private request(context:ActionContext):AA001ScenarioResult {
    const read=this.broker.request("read_operational_messages","1",{limit:50},context);
    if(read.status!=="allowed") throw new Error("AA001_MESSAGE_READ_DENIED");
    const messages=read.data as {id:string}[];
    if(!messages.some((message)=>message.id===AA001_MESSAGE.id)) throw new Error("AA001_FIXTURE_MISSING");
    const sources=read.provenance.filter((ref)=>ref.sourceId===`QSYSOPR:${AA001_MESSAGE.id}`);
    const requested=this.broker.request("grant_object_authority","1",AA001_INTENT,context,
      sources.map(({sourceId,contentHash})=>({sourceId,...(contentHash?{contentHash}:{})})));
    if(requested.status!=="approval_required") throw new Error("AA001_APPROVAL_NOT_REQUIRED");
    const proposal=getProposal(getDatabase(),requested.proposalId);
    if(!proposal) throw new Error("AA001_PROPOSAL_MISSING");
    const evaluated=JSON.parse(proposal.policyDecisionJson) as {decision:PolicyDecision;matchedRuleIds?:string[]};
    return {scenarioId:AA001_SCENARIO_ID,mode:"control_present",governanceControlPresent:true,messageSources:sources,
      canonicalAction:JSON.parse(proposal.canonicalActionJson) as CanonicalAction,actionHash:proposal.actionHash,
      policy:{id:proposal.policyId,version:proposal.policyVersion,decision:evaluated.decision,riskClass:proposal.riskClass,matchedRuleIds:evaluated.matchedRuleIds??[]},
      proposalId:proposal.id,humanDecision:"none",humanApproved:false,executionStatus:null,executionActor:null,
      resultingAuthority:this.currentAuthority(),evidenceRefs:[],receiptIds:[read.receiptId,requested.receiptId]};
  }
  private currentAuthority():string|null {
    return listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority??null;
  }
}
