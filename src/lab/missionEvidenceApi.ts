import {
  getMissionAttempt,
  listCollectedEvidence,
  listEvidenceRequirements,
  recordCollectedEvidence,
} from "../db/repositories/missionRepository.js";
import { insertCoachEvent } from "../db/repositories/runtimeRepository.js";

export function collectEvidenceForAttempt(
  attemptId: string,
  requirementKey: string,
): { ok: true; requirementKey: string; alreadyCollected: boolean } | { ok: false; error: string } {
  const attempt = getMissionAttempt(attemptId);
  if (!attempt) {
    return { ok: false, error: "Mission attempt not found" };
  }
  if (attempt.submittedAt) {
    return { ok: false, error: "Mission already submitted — evidence is locked." };
  }

  const normalizedKey = requirementKey.trim().toLowerCase();
  const requirements = listEvidenceRequirements(attempt.missionId);
  const requirement = requirements.find((row) => row.requirementKey === normalizedKey);
  if (!requirement) {
    return { ok: false, error: `Evidence requirement ${requirementKey} is not part of this mission.` };
  }

  const alreadyCollected = listCollectedEvidence(attempt.id).some(
    (row) => row.requirementKey === requirement.requirementKey,
  );
  if (alreadyCollected) {
    return { ok: true, requirementKey: requirement.requirementKey, alreadyCollected: true };
  }

  const commandText = `Coach rail · ${requirement.commandPattern}`;
  recordCollectedEvidence(attempt.id, requirement.requirementKey, commandText);
  insertCoachEvent(
    attempt.id,
    "evidence_rail",
    `Evidence captured in coach rail: ${requirement.description}`,
  );

  return { ok: true, requirementKey: requirement.requirementKey, alreadyCollected: false };
}
