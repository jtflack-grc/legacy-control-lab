import { getDatabase } from "../../db/sqlite.js";
import { grantObjectAuthority } from "../../ibmi-runtime/authorityService.js";
import { applyMutation } from "../../runtime/runtimeMutationService.js";
import { createAgentServiceSession, AGENT_SERVICE_USER } from "../serviceIdentity.js";
import { buildCanonicalAction } from "../fingerprint.js";
import { authorityToolRegistry } from "../toolRegistry.js";
import type { LclTargetAdapter, LclMutationResult } from "../adapters/lclTargetAdapter.js";

export type SyntheticLclTarget = {kind:"lcl";system:"CLAIMS400"};
export type CounterfactualResult = LclMutationResult & {
  mode:"synthetic_counterfactual";humanApproved:false;governanceControlPresent:false;
};

/** Synthetic experimental control group only. This is not a broker mode or runtime bypass switch. */
export class SyntheticCounterfactualExecutor {
  private readonly session=createAgentServiceSession("CLAIMS400");
  constructor(private readonly adapter:LclTargetAdapter,target:SyntheticLclTarget) {
    if(target.kind!=="lcl"||target.system!=="CLAIMS400"||adapter.kind!=="lcl"||adapter.system!=="CLAIMS400") throw new Error("SYNTHETIC_TARGET_ONLY");
  }
  execute(tool:"grant_object_authority",args:{library:string;object:string;user:string;authority:string}):CounterfactualResult {
    if(tool!=="grant_object_authority") throw new Error("COUNTERFACTUAL_TOOL_NOT_ALLOWED");
    const trustedArgs=authorityToolRegistry.require(tool,"1").normalizeArguments(args);
    const action=buildCanonicalAction({targetKind:"lcl",targetSystem:"CLAIMS400",toolName:tool,toolVersion:"1",arguments:trustedArgs});
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
    const evidence=applied.ok?this.adapter.collectEvidence(attemptId,applied.stateChangeId):[];
    return {mode:"synthetic_counterfactual",humanApproved:false,governanceControlPresent:false,
      status:applied.ok?"succeeded":"failed",actor:AGENT_SERVICE_USER,attemptId,before,after,
      ...(applied.ok?{stateChangeId:applied.stateChangeId}:{error:applied.message}),evidence};
  }
}
