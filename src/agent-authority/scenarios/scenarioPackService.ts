import {getApprovalForProposal,getProposal,listProposals,listReceiptsBounded,type ProposalRecord} from "../../db/repositories/agentAuthorityRepository.js";
import {listObjectAuthorities} from "../../db/repositories/objectAuthorityRepository.js";
import {buildProposalProofBundle} from "../proof/proofBuilder.js";
import {verifyProofBundle} from "../proof/proofVerifier.js";
import type {AgentAuthorityRuntime} from "../runtime.js";
import type {ActionContext} from "../types.js";
import {AA001DeterministicAgent} from "./aa001Runner.js";
import {AGENT_AUTHORITY_SCENARIOS,requireScenario,type AgentAuthorityScenarioId} from "./scenarioCatalog.js";

type GuidedAction="create_initial_request"|"submit_narrower_request"|"run_investigation"|"create_mutation_request"|"attempt_out_of_scope_request";
const INTENTS={
  "AA-002":{library:"PAYROLL",object:"PAYMST",user:"AUDIT",authority:"*ALL"},
  "AA-003":{library:"PAYROLL",object:"PAYMST",user:"OLDVENDOR",authority:"*USE"},
  "AA-004":{library:"PAYROLL",object:"PAYMST",user:"BACKUPADM",authority:"*USE"},
  "AA-005":{library:"CLAIMS400",object:"CLAIMMST",user:"AUDIT",authority:"*USE"},
} as const;

export class ScenarioPackService {
  constructor(private readonly runtime:AgentAuthorityRuntime){}

  catalog(){return {scenarios:AGENT_AUTHORITY_SCENARIOS.map((scenario)=>({...scenario,status:this.status(scenario.id)}))};}

  act(id:AgentAuthorityScenarioId,action:GuidedAction){
    requireScenario(id);
    if(id==="AA-001"&&action==="create_initial_request"){
      if(!this.proposals(id).length)new AA001DeterministicAgent(this.runtime.broker,this.runtime.approvals).run(this.context(id,"initial"));
    } else if(id==="AA-002"&&action==="create_initial_request") this.requestOnce(id,"initial",INTENTS[id]);
    else if(id==="AA-002"&&action==="submit_narrower_request"){
      const initial=this.proposals(id,"initial")[0];if(!initial||initial.status!=="denied")throw new Error("INITIAL_REQUEST_MUST_BE_DENIED");
      this.requestOnce(id,"narrow",{...INTENTS[id],authority:"*USE"});
    } else if(id==="AA-003"&&action==="create_initial_request") this.requestOnce(id,"initial",INTENTS[id]);
    else if(id==="AA-004"&&action==="run_investigation") this.investigate();
    else if(id==="AA-004"&&action==="create_mutation_request"){
      if(this.readReceipts(id).length<3)throw new Error("INVESTIGATION_REQUIRED");this.requestOnce(id,"mutation",INTENTS[id]);
    } else if(id==="AA-005"&&action==="attempt_out_of_scope_request"){
      if(!this.readReceipts(id).some((r)=>r.type==="request_denied"))this.runtime.broker.request("grant_object_authority","1",INTENTS[id],this.context(id,"boundary"));
    } else throw new Error("INVALID_SCENARIO_ACTION");
    return this.project(id);
  }

  project(id:AgentAuthorityScenarioId){
    const definition=requireScenario(id);const proposals=this.proposals(id);const receipts=this.readReceipts(id);
    const target=id==="AA-005"?{library:"CLAIMS400",object:"CLAIMMST",user:"AUDIT"}:{library:"PAYROLL",object:"PAYMST",user:this.user(id)};
    const current=listObjectAuthorities("CLAIMS400",target.library,target.object).find((row)=>row.userName===target.user)?.authority??null;
    return {scenario:definition,status:this.status(id),target,currentAuthority:current,proposals:proposals.map((p)=>this.proposal(p)),
      observations:this.observations(id,receipts),denial:receipts.find((r)=>r.type==="request_denied")??null,
      commands:this.commands(id),allowedBoundary:"PAYROLL/PAYMST"};
  }

  private investigate(){
    if(this.readReceipts("AA-004").filter((r)=>r.type==="read_allowed").length>=3)return;
    const context=this.context("AA-004","investigation");
    this.runtime.broker.request("inspect_user_profile","1",{user:"BACKUPADM"},context);
    this.runtime.broker.request("inspect_object_authority","1",{library:"PAYROLL",object:"PAYMST",user:"BACKUPADM"},context);
    this.runtime.broker.request("list_recent_audit_events","1",{user:"BACKUPADM",limit:10},context);
  }
  private requestOnce(id:AgentAuthorityScenarioId,part:string,args:Record<string,unknown>){if(!this.proposals(id,part).length)this.runtime.broker.request("grant_object_authority","1",args,this.context(id,part));}
  private context(id:AgentAuthorityScenarioId,part:string):ActionContext{return {requestId:this.runtime.ids.id(`guided-${id}`),agentSessionId:this.runtime.principalId,actorType:"agent",requestedAt:this.runtime.clock.now().toISOString(),clientName:`lcl-guided-${id}-${part}`,clientVersion:"1"};}
  private proposals(id:AgentAuthorityScenarioId,part?:string):ProposalRecord[]{return listProposals(this.runtime.db,{limit:100}).filter((p)=>{try{const c=JSON.parse(p.requestContextJson) as Record<string,unknown>;return c.clientName===`lcl-guided-${id}-${part??"initial"}`||(!part&&typeof c.clientName==="string"&&c.clientName.startsWith(`lcl-guided-${id}-`))||(!part&&id==="AA-001"&&c.clientName==="lcl-guided-walkthrough");}catch{return false;}});}
  private readReceipts(id:AgentAuthorityScenarioId){return listReceiptsBounded(this.runtime.db,{limit:100,afterSequence:0}).flatMap((receipt)=>{try{const payload=JSON.parse(receipt.payloadJson) as Record<string,unknown>;const request=payload.request as Record<string,unknown>|undefined;const client=String(request?.clientName??"");if(client.startsWith(`lcl-guided-${id}-`)||(id==="AA-001"&&client==="lcl-guided-walkthrough"))return [{id:receipt.id,type:receipt.receiptType,payload}];}catch{}return [];});}
  private proposal(p:ProposalRecord){const approval=getApprovalForProposal(this.runtime.db,p.id);let verified=false;if(["denied","expired","invalidated","consumed"].includes(p.status))try{verified=verifyProofBundle(buildProposalProofBundle(this.runtime.db,p.id,this.runtime)).ok;}catch{}
    return {id:p.id,status:p.status,action:JSON.parse(p.canonicalActionJson),actionHash:p.actionHash,preconditionHash:p.preconditionHash,executionStatus:p.executionStatus??null,decision:{by:p.decidedBy??null,reason:p.decisionReason??null},approvalId:approval?.id??null,proof:{available:["denied","expired","invalidated","consumed"].includes(p.status),verified}};}
  private observations(id:AgentAuthorityScenarioId,receipts:ReturnType<ScenarioPackService["readReceipts"]>){if(id!=="AA-004")return [];const summaries:Record<string,string>={inspect_user_profile:"BACKUPADM is an old enabled privileged account.",inspect_object_authority:"BACKUPADM currently has *ALL private authority on PAYROLL/PAYMST.",list_recent_audit_events:"Recent BACKUPADM audit activity was reviewed within a bounded result set."};return receipts.filter((r)=>r.type==="read_allowed").map((r)=>{const action=r.payload.action as Record<string,unknown>|undefined;const tool=String(action?.tool_name??action?.toolName??"observation");return {receiptId:r.id,tool,summary:summaries[tool]??"Observation recorded.",approvalRequired:false};});}
  private status(id:AgentAuthorityScenarioId){const proposals=this.proposals(id);const receipts=this.readReceipts(id);if(id==="AA-005"&&receipts.some((r)=>r.type==="request_denied"))return "complete";if(id==="AA-004"&&!proposals.length&&receipts.length)return "in_progress";if(!proposals.length)return "not_started";if(proposals.some((p)=>p.status==="pending"))return "in_progress";if(id==="AA-002"){const broad=proposals.find((p)=>JSON.parse(p.argumentsJson).authority==="*ALL");const narrow=proposals.find((p)=>JSON.parse(p.argumentsJson).authority==="*USE");if(broad&&["approved","consumed"].includes(broad.status))return "complete_with_warning";if(broad?.status==="denied"&&!narrow)return "in_progress";}return "complete";}
  private user(id:AgentAuthorityScenarioId){return id==="AA-001"?"APCLERK":id==="AA-002"?"AUDIT":id==="AA-003"?"OLDVENDOR":"BACKUPADM";}
  private commands(id:AgentAuthorityScenarioId){const display=id==="AA-005"?"DSPOBJAUT OBJ(CLAIMS400/CLAIMMST)":"DSPOBJAUT OBJ(PAYROLL/PAYMST)";return id==="AA-003"?["GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(OLDVENDOR) AUT(*EXCLUDE)",display]:[display];}
}
