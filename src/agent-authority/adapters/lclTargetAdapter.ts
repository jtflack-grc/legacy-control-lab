import { getDatabase } from "../../db/sqlite.js";
import { listObjectAuthorities } from "../../db/repositories/objectAuthorityRepository.js";
import { getUserProfile } from "../../ibmi-runtime/userProfileService.js";
import { getObjectAuthorityDisplay, grantObjectAuthority } from "../../ibmi-runtime/authorityService.js";
import { listAuditJournalEntries } from "../../ibmi-runtime/auditJournalService.js";
import { getMessages } from "../../ibmi-runtime/messageService.js";
import { sessionHasSpecialAuthority } from "../../ibmi-runtime/authorityCheck.js";
import { applyMutation } from "../../runtime/runtimeMutationService.js";
import { listGeneratedAudit, listRuntimeJobLog, listStateChanges } from "../../db/repositories/runtimeRepository.js";
import { createAgentServiceSession, AGENT_SERVICE_USER } from "../serviceIdentity.js";
import type { ActionContext, CanonicalAction } from "../types.js";
import type { TargetAdapter, TargetEvidenceRef, TargetMutationResult, TargetReadResult } from "./targetAdapter.js";

const ALLOWED_SYSTEM = "CLAIMS400";
const MUTATION_ALLOWLIST = new Set(["PAYROLL/PAYMST"]);

export class LclTargetAdapter implements TargetAdapter {
  readonly kind = "lcl" as const;
  readonly system = ALLOWED_SYSTEM;
  private readonly serviceSession = createAgentServiceSession(this.system);

  read(operation: string, args: Record<string, unknown>, _context: ActionContext): TargetReadResult {
    switch (operation) {
      case "inspect_user_profile":
        return { data: requireFound(getUserProfile(args.user as string, this.system), "USER_NOT_FOUND"), provenance: [trustedSystem("user_profile")] };
      case "inspect_object_authority":
        return { data: requireFound(getObjectAuthorityDisplay(this.system, args.library as string, args.object as string, args.user as string), "OBJECT_NOT_FOUND"), provenance: [trustedSystem("object_authority")] };
      case "list_recent_audit_events": {
        const limit = args.limit as number;
        const events = listAuditJournalEntries(this.system, { userName: args.user as string }).slice(-limit);
        return { data: events, provenance: [trustedSystem("audit_journal")] };
      }
      case "read_operational_messages": {
        const messages = getMessages("QSYSOPR", this.serviceSession).slice(0, args.limit as number);
        return {
          data: messages,
          provenance: messages.map((message) => ({
            sourceId: `QSYSOPR:${message.id}`,
            sourceType: "operational_message",
            trustClass: "untrusted_operational_data" as const,
          })),
        };
      }
      default:
        throw new Error("UNSUPPORTED_READ_OPERATION");
    }
  }

  snapshot(action: CanonicalAction): Record<string, unknown> {
    if (action.tool_name !== "grant_object_authority") throw new Error("UNSUPPORTED_SNAPSHOT_OPERATION");
    this.requireAllowedMutation(action);
    const args = action.arguments as { library:string; object:string; user:string };
    const display = requireFound(getObjectAuthorityDisplay(this.system,args.library,args.object,args.user),"OBJECT_NOT_FOUND");
    const privateEntry = listObjectAuthorities(this.system,args.library,args.object).find((row)=>row.userName===args.user) ?? null;
    const effective = privateEntry?.authority ?? (display.owner === args.user ? "*ALL" : display.publicAuthority);
    return {
      system:this.system, library:display.library, object:display.object, target_user:args.user,
      private_authority_entry:privateEntry, current_effective_authority:effective,
      owner:display.owner, public_authority:display.publicAuthority,
    };
  }

  executeMutation(action: CanonicalAction): TargetMutationResult {
    if (action.tool_name !== "grant_object_authority") throw new Error("UNSUPPORTED_MUTATION_OPERATION");
    this.requireAllowedMutation(action);
    if (!sessionHasSpecialAuthority(this.serviceSession,["*OBJMGT"])) throw new Error("SERVICE_IDENTITY_NOT_AUTHORIZED");
    const args = action.arguments as {library:string;object:string;user:string;authority:string};
    const before = this.snapshot(action);
    const after = { ...before, private_authority_entry:{userName:args.user,authority:args.authority}, current_effective_authority:args.authority };
    const commandText = `GRTOBJAUT OBJ(${args.library}/${args.object}) USER(${args.user}) AUT(${args.authority})`;
    const result = getDatabase().transaction(() => applyMutation(this.serviceSession, {
      commandText, mutationType:"GRTOBJAUT", entityType:"object_authority",
      entityId:`${args.library}/${args.object} ${args.user}`, before, after,
      evidenceTags:["agent_authority","object_authority_changed"], auditEntryType:"CA",
      auditObjectRef:`${args.library}/${args.object}`,
      auditMessage:`Agent Authority granted ${args.authority} to ${args.user} for ${args.library}/${args.object}.`,
      jobLogMessages:[`LCL2003 - MCPAGENT changed object authority on ${args.library}/${args.object}.`],
      coachEventKey:"object_authority_changed",
    }, () => grantObjectAuthority(this.system,args.library,args.object,args.user,args.authority))).immediate();
    if (!result.ok) return {status:"failed",actor:AGENT_SERVICE_USER,attemptId:this.attemptId(),before,after,evidence:[],error:result.message};
    const evidence = this.collectEvidence(this.attemptId(),result.stateChangeId);
    const hasAudit=evidence.some((e)=>e.type==="runtime_generated_audit");
    const hasJob=evidence.some((e)=>e.type==="runtime_job_log_entry");
    if (!result.stateChangeId || !hasAudit || !hasJob) return {status:"failed",actor:AGENT_SERVICE_USER,attemptId:this.attemptId(),before,after,stateChangeId:result.stateChangeId,evidence,error:"EXPECTED_EVIDENCE_MISSING"};
    return {status:"succeeded",actor:AGENT_SERVICE_USER,attemptId:this.attemptId(),before,after,stateChangeId:result.stateChangeId,evidence};
  }

  collectEvidence(attemptId:string,stateChangeId:string):TargetEvidenceRef[] {
    const change=listStateChanges(attemptId,"object_authority").find((row)=>row.id===stateChangeId);
    if (!change) return [];
    const refs:TargetEvidenceRef[]=[{type:"runtime_state_change",id:change.id}];
    for (const effect of change.sideEffects) {
      if (effect.type==="audit_journal_entry") refs.push({type:"runtime_generated_audit",id:effect.id});
      else if (effect.type==="job_log_entry") refs.push({type:"runtime_job_log_entry",id:effect.id});
      else if (effect.type==="evidence_event") refs.push({type:"evidence_tag",id:effect.id});
    }
    const auditIds=new Set(listGeneratedAudit(attemptId).map((row)=>row.id));
    const jobIds=new Set(listRuntimeJobLog(attemptId).map((row)=>row.id));
    return refs.filter((ref)=>ref.type==="runtime_state_change"||ref.type==="evidence_tag"||
      (ref.type==="runtime_generated_audit"&&auditIds.has(ref.id))||(ref.type==="runtime_job_log_entry"&&jobIds.has(ref.id)));
  }

  getServiceAttemptId():string { return this.attemptId(); }
  private attemptId():string {
    if (!this.serviceSession.missionAttemptId) throw new Error("AGENT_ATTEMPT_MISSING");
    return this.serviceSession.missionAttemptId;
  }
  private requireAllowedMutation(action:CanonicalAction):void {
    if (action.target_kind!=="lcl"||action.target_system!==ALLOWED_SYSTEM) throw new Error("TARGET_NOT_ALLOWED");
    const key=`${String(action.arguments.library)}/${String(action.arguments.object)}`;
    if (!MUTATION_ALLOWLIST.has(key)) throw new Error("TARGET_NOT_ALLOWED");
  }
}

function requireFound<T>(value:T|undefined,error:string):T { if (!value) throw new Error(error); return value; }
function trustedSystem(sourceType:string) { return {sourceId:`CLAIMS400:${sourceType}`,sourceType,trustClass:"trusted_system" as const}; }
