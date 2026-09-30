import type { Database as SqliteDatabase } from "better-sqlite3";
import { canonicalize } from "../canonicalize.js";
import { buildCanonicalAction, fingerprint } from "../fingerprint.js";
import { createReceipt } from "../evidence/receiptIntegrity.js";
import { authorityToolRegistry, type ToolRegistry } from "../toolRegistry.js";
import { evaluatePolicy } from "../policy/policyEngine.js";
import type { AuthorityPolicy } from "../policy/types.js";
import type { ActionContext, Clock, IdGenerator, ProvenanceRef } from "../types.js";
import { getProposal, insertProposal } from "../../db/repositories/agentAuthorityRepository.js";
import type { TargetAdapter } from "../adapters/targetAdapter.js";

export type BrokerResult =
  | {status:"allowed";data:unknown;provenance:ProvenanceRef[];receiptId:string}
  | {status:"approval_required";proposalId:string;actionHash:string;expiresAt:string;receiptId:string}
  | {status:"denied";reason:string;receiptId:string}
  | {status:"found";proposal:ReturnType<typeof getProposal>;receiptId:string};

export type ObservedProvenanceReference = { sourceId:string; contentHash?:string };

export class AuthorityBroker {
  private readonly observedProvenance = new Map<string,ProvenanceRef>();
  constructor(private readonly deps:{
    db:SqliteDatabase; adapter:TargetAdapter; policy:AuthorityPolicy; clock:Clock; ids:IdGenerator;
    registry?:ToolRegistry; proposalTtlSeconds?:number;
  }) {}

  request(toolName:string,toolVersion:string,rawArgs:unknown,context:ActionContext,usedSources:readonly ObservedProvenanceReference[]=[]):BrokerResult {
    const registry=this.deps.registry??authorityToolRegistry;
    let tool;
    try { tool=registry.require(toolName,toolVersion); }
    catch { return this.denied("UNKNOWN_TOOL",context,{toolName,toolVersion}); }
    let args:Record<string,unknown>;
    try { args=tool.normalizeArguments(rawArgs); }
    catch { return this.denied("INVALID_ARGUMENTS",context,{toolName,toolVersion}); }

    const action=buildCanonicalAction({targetKind:this.deps.adapter.kind,targetSystem:this.deps.adapter.system,
      toolName:tool.name,toolVersion:tool.version,arguments:args});
    const actionIdentity=fingerprint(action);
    const policy=evaluatePolicy(this.deps.policy,tool.riskClass);
    const provenance=this.resolveObservedProvenance(context,usedSources);
    if (policy.decision==="deny") return this.denied("POLICY_DENIED",context,{action,actionHash:actionIdentity.hash,policy,provenance});

    if (tool.name==="get_action_status") {
      const proposal=getProposal(this.deps.db,args.proposal_id as string);
      const receipt=createReceipt(this.deps.db,this.deps,{type:"read_allowed",proposalId:proposal?.id,payload:{
        request:context,action,action_hash:actionIdentity.hash,policy:{...policy,risk_class:tool.riskClass},provenance,
        result:{found:Boolean(proposal),status:proposal?.status??null,execution_status:proposal?.executionStatus??null},
      }});
      return {status:"found",proposal,receiptId:receipt.id};
    }

    if (!tool.mutating && policy.decision==="allow") {
      const result=this.deps.adapter.read(tool.adapterOperation,args,context);
      this.rememberObservedProvenance(context,result.provenance);
      const receipt=createReceipt(this.deps.db,this.deps,{type:"read_allowed",payload:{
        request:context,action,action_hash:actionIdentity.hash,policy:{...policy,risk_class:tool.riskClass},
        result_digest:fingerprint(result.data).hash,provenance:result.provenance,
      }});
      return {status:"allowed",data:result.data,provenance:result.provenance,receiptId:receipt.id};
    }

    if (policy.decision!=="require_approval") return this.denied("MUTATION_NOT_AUTHORIZED",context,{action,actionHash:actionIdentity.hash,policy});
    let precondition:Record<string,unknown>;
    try { precondition=this.deps.adapter.snapshot(action); }
    catch (error) { return this.denied(error instanceof Error?error.message:"TARGET_UNAVAILABLE",context,{action,actionHash:actionIdentity.hash,policy}); }
    const preconditionIdentity=fingerprint(precondition);
    const createdAt=this.deps.clock.now();
    const expiresAt=new Date(createdAt.getTime()+(this.deps.proposalTtlSeconds??300)*1000).toISOString();
    const proposalId=this.deps.ids.id("prop");
    insertProposal(this.deps.db,{
      id:proposalId,createdAt:createdAt.toISOString(),expiresAt,status:"pending",
      targetKind:action.target_kind,targetSystem:action.target_system,toolName:action.tool_name,toolVersion:action.tool_version,
      riskClass:tool.riskClass,argumentsJson:canonicalize(args),canonicalActionJson:actionIdentity.canonicalJson,actionHash:actionIdentity.hash,
      policyId:policy.policyId,policyVersion:policy.policyVersion,policyDecisionJson:canonicalize(policy),
      preconditionJson:preconditionIdentity.canonicalJson,preconditionHash:preconditionIdentity.hash,
      requestContextJson:canonicalize(context),provenanceJson:provenance.length?canonicalize(provenance):undefined,
    });
    const receipt=createReceipt(this.deps.db,this.deps,{type:"approval_required",proposalId,payload:{
      request:context,action,action_hash:actionIdentity.hash,policy:{...policy,risk_class:tool.riskClass},provenance,
      precondition:{digest:preconditionIdentity.hash,summary:precondition},expires_at:expiresAt,
    }});
    return {status:"approval_required",proposalId,actionHash:actionIdentity.hash,expiresAt,receiptId:receipt.id};
  }

  private provenanceKey(context:ActionContext,sourceId:string):string { return `${context.agentSessionId}\u0000${sourceId}`; }
  private rememberObservedProvenance(context:ActionContext,refs:readonly ProvenanceRef[]):void {
    for (const ref of refs) this.observedProvenance.set(this.provenanceKey(context,ref.sourceId),Object.freeze({...ref}));
  }
  private resolveObservedProvenance(context:ActionContext,requested:readonly ObservedProvenanceReference[]):ProvenanceRef[] {
    return requested.flatMap((reference)=>{
      const issued=this.observedProvenance.get(this.provenanceKey(context,reference.sourceId));
      if (!issued) return [];
      if (issued.contentHash!==undefined&&reference.contentHash!==issued.contentHash) return [];
      return [issued];
    });
  }

  private denied(reason:string,context:ActionContext,detail:Record<string,unknown>):BrokerResult {
    const receipt=createReceipt(this.deps.db,this.deps,{type:"request_denied",payload:{request:context,reason,...detail}});
    return {status:"denied",reason,receiptId:receipt.id};
  }
}
