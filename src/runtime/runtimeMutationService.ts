import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { recordEvidenceTag } from "../db/repositories/missionRepository.js";
import {
  insertCoachEvent,
  insertGeneratedAudit,
  insertRuntimeJobLog,
  insertStateChange,
} from "../db/repositories/runtimeRepository.js";
import type { MutationIntent, RuntimeSideEffect } from "./types.js";

export function applyMutation(
  session: IbmiSession,
  intent: MutationIntent,
  applyChange: () => { ok: true } | { ok: false; message: string },
): { ok: true; stateChangeId: string } | { ok: false; message: string } {
  const attemptId = session.missionAttemptId;
  if (!attemptId) {
    const bare = applyChange();
    return bare.ok ? { ok: true, stateChangeId: "" } : bare;
  }

  const result = applyChange();
  if (!result.ok) {
    return result;
  }

  const timestamp = new Date().toISOString();
  const actor = session.userName ?? "UNKNOWN";
  const sideEffects: RuntimeSideEffect[] = [];

  if (intent.auditEntryType) {
    const auditId = insertGeneratedAudit({
      attemptId,
      entryTime: timestamp,
      userName: actor,
      entryType: intent.auditEntryType,
      objectRef: intent.auditObjectRef ?? intent.entityId,
      message: intent.auditMessage,
      sourceCommand: intent.commandText,
    });
    sideEffects.push({ type: "audit_journal_entry", id: auditId });
  }

  for (const line of intent.jobLogMessages ?? [`CPI0000 - Command ${intent.mutationType} completed.`]) {
    const jobLogId = insertRuntimeJobLog({
      attemptId,
      timestamp,
      messageText: line,
      messageId: line.startsWith("LCL") ? line.slice(0, 7) : line.startsWith("CPI") ? "CPI0000" : undefined,
    });
    sideEffects.push({ type: "job_log_entry", id: jobLogId });
  }

  for (const tag of intent.evidenceTags) {
    recordEvidenceTag(attemptId, tag, intent.commandText);
    sideEffects.push({ type: "evidence_event", id: tag });
  }

  if (intent.coachEventKey) {
    const coachId = insertCoachEvent(
      attemptId,
      intent.coachEventKey,
      buildCoachMessage(intent),
    );
    sideEffects.push({ type: "coach_event", id: coachId });
  }

  const stateChangeId = insertStateChange({
    attemptId,
    timestamp,
    commandText: intent.commandText,
    actor,
    entityType: intent.entityType,
    entityId: intent.entityId,
    before: intent.before,
    after: intent.after,
    sideEffects,
  });

  return { ok: true, stateChangeId };
}

function buildCoachMessage(intent: MutationIntent): string {
  switch (intent.coachEventKey) {
    case "user_profile_changed":
      return "User profile mutation recorded. Compare before/after with DSPEVDDIFF TYPE(*USRPRF).";
    case "system_value_changed":
      return "System value changed in the simulated runtime. Audit and job log side effects were generated.";
    case "object_authority_changed":
      return "Object authority updated. Review PAYMST and other sensitive objects in your findings.";
    case "ifs_authority_changed":
      return "IFS authority changed. Document exposure remediation in your evidence packet.";
    case "spool_changed":
      return "Spooled file status changed. Operational evidence may now differ from the briefing.";
    case "library_list_changed":
      return "Library list updated for this session. Use DSPLIBL to verify.";
    case "lab_reset":
      return "Mission attempt reset to scenario baseline. Re-run evidence collection from the AUDIT menu.";
    case "message_replied":
      return "Operator reply recorded on QSYSOPR inquiry message — document response workflow in findings.";
    default:
      return `Runtime mutation applied: ${intent.entityType} ${intent.entityId}`;
  }
}
