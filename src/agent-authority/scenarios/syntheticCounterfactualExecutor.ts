import { getDatabase } from "../../db/sqlite.js";
import { listObjectAuthorities } from "../../db/repositories/objectAuthorityRepository.js";
import { grantObjectAuthority } from "../../ibmi-runtime/authorityService.js";
import { applyMutation } from "../../runtime/runtimeMutationService.js";
import { createAgentServiceSession } from "../serviceIdentity.js";
import { buildCanonicalAction, fingerprint } from "../fingerprint.js";
import { authorityToolRegistry } from "../toolRegistry.js";
import { loadPolicy } from "../policy/policyLoader.js";
import { evaluatePolicy } from "../policy/policyEngine.js";
import type { LclTargetAdapter } from "../adapters/lclTargetAdapter.js";
import type { AA001ScenarioResult } from "./aa001Runner.js";
import { AA001_MESSAGE, AA001_SCENARIO_ID } from "./aa001Fixture.js";

export type SyntheticLclTarget = {kind:"lcl";system:"CLAIMS400"};

/** Synthetic experimental control group only. This is not a broker mode or runtime bypass switch. */
export class SyntheticCounterfactualExecutor {
  private readonly session=createAgentServiceSession("CLAIMS400");
  constructor(private readonly adapter:LclTargetAdapter,target:SyntheticLclTarget) {
    if(target.kind!=="lcl"||target.system!=="CLAIMS400"||adapter.kind!=="lcl"||adapter.system!=="CLAIMS400") throw new Error("SYNTHETIC_TARGET_ONLY");
  }
  execute(tool:"grant_object_authority",args:{library:string;object:string;user:string;authority:string}):AA001ScenarioResult {
    if(tool!=="grant_object_authority") throw new Error("COUNTERFACTUAL_TOOL_NOT_ALLOWED");
    const definition=authorityToolRegistry.require(tool,"1");
    const trustedArgs=definition.normalizeArguments(args);
    const action=buildCanonicalAction({targetKind:"lcl",targetSystem:"CLAIMS400",toolName:tool,toolVersion:"1",arguments:trustedArgs});
    const actionIdentity=fingerprint(action);
    const before=this.adapter.snapshot(action);
    const normalized=action.arguments as typeof args;
    const after={...before,private_authority_entry:{userName:normalized.user,authority:normalized.authority},current_effective_authority:normalized.authority};
    const commandText=`GRTOBJAUT OBJ(${normalized.library}/${normalized.object}) USER(${normalized.user}) AUT(${normalized.authority})`;
    const applied=getDatabase().transaction(()=>applyMutation(this.session,{
      commandText,mutationType:"GRTOBJAUT",entityType:"object_authority",entityId:`${normalized.library}/${normalized.object} ${normalized.user}`,
      before,after,evidenceTags:["synthetic_counterfactual","governance_control_absent","object_authority_changed"],auditEntryType:"CA",
      auditObjectRef:`${normalized.library}/${normalized.object}`,auditMessage:"Synthetic counterfactual authority mutation; no human approval.",
      jobLogMessages:["LCL2099 - Synthetic counterfactual execution with Agent Authority control absent."],coachEventKey:"object_authority_changed",
    },()=>grantObjectAuthority("CLAIMS400",normalized.library,normalized.object,normalized.user,normalized.authority))).immediate();
    const attemptId=this.session.missionAttemptId!;
    const evidenceRefs=applied.ok?this.adapter.collectEvidence(attemptId,applied.stateChangeId):[];
    const policy=evaluatePolicy(loadPolicy("data/agent-authority/policy.v1.json"),definition.riskClass);
    const messageSources=[{sourceId:`QSYSOPR:${AA001_MESSAGE.id}`,sourceType:"operational_message",trustClass:"untrusted_operational_data" as const,contentHash:fingerprint(AA001_MESSAGE).hash}];
    const resultingAuthority=listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority??null;
    return {scenarioId:AA001_SCENARIO_ID,mode:"synthetic_counterfactual",governanceControlPresent:false,messageSources,
      canonicalAction:action,actionHash:actionIdentity.hash,
      policy:{id:policy.policyId,version:policy.policyVersion,decision:policy.decision,riskClass:definition.riskClass,matchedRuleIds:policy.matchedRuleIds},
      proposalId:null,humanDecision:"none",humanApproved:false,executionStatus:applied.ok?"succeeded":"failed",executionActor:this.session.userName??null,
      resultingAuthority,evidenceRefs,receiptIds:[]};
  }
}
