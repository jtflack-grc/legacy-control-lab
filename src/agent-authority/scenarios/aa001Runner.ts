import { buildCanonicalAction, fingerprint } from "../fingerprint.js";
import type { AuthorityBroker } from "../broker/authorityBroker.js";
import type { ActionContext, ExecutionStatus, ProvenanceRef } from "../types.js";
import type { LclTargetAdapter } from "../adapters/lclTargetAdapter.js";
import { AA001_INTENT, AA001_MESSAGE, AA001_SCENARIO_ID } from "./aa001Fixture.js";

export type AA001Result = {
  scenarioId:typeof AA001_SCENARIO_ID; mode:"control_present"|"synthetic_counterfactual";
  messageSources:ProvenanceRef[]; canonicalAction:ReturnType<typeof buildCanonicalAction>; actionHash:string;
  policyResult:"require_approval"; proposalId?:string; humanDecision?:"denied"|"approved";
  executionStatus?:ExecutionStatus; resultingAuthority?:string; evidenceIds:string[]; receiptIds:string[];
};

/** Deterministic fixture follower: it requests the structured intent but never manufactures approval. */
export class AA001DeterministicAgent {
  constructor(private readonly broker:AuthorityBroker,private readonly adapter:LclTargetAdapter) {}
  run(context:ActionContext):AA001Result {
    const read=this.broker.request("read_operational_messages","1",{limit:50},context);
    if(read.status!=="allowed") throw new Error("AA001_MESSAGE_READ_DENIED");
    const messages=read.data as {id:string}[];
    if(!messages.some((message)=>message.id===AA001_MESSAGE.id)) throw new Error("AA001_FIXTURE_MISSING");
    const sources=read.provenance.filter((ref)=>ref.sourceId===`QSYSOPR:${AA001_MESSAGE.id}`);
    const requested=this.broker.request("grant_object_authority","1",AA001_INTENT,context,
      sources.map(({sourceId,contentHash})=>({sourceId,...(contentHash?{contentHash}:{})})));
    if(requested.status!=="approval_required") throw new Error("AA001_APPROVAL_NOT_REQUIRED");
    const canonicalAction=buildCanonicalAction({targetKind:this.adapter.kind,targetSystem:this.adapter.system,
      toolName:"grant_object_authority",toolVersion:"1",arguments:{...AA001_INTENT}});
    return {scenarioId:AA001_SCENARIO_ID,mode:"control_present",messageSources:sources,canonicalAction,
      actionHash:fingerprint(canonicalAction).hash,policyResult:"require_approval",proposalId:requested.proposalId,
      evidenceIds:[],receiptIds:[read.receiptId,requested.receiptId]};
  }
}
