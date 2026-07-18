import type { FindingInput, FindingRow } from "../db/repositories/findingRepository.js";
import {
  listFindings,
  saveFinding as saveFindingRow,
  updateFinding as updateFindingRow,
} from "../db/repositories/findingRepository.js";

export type Finding = FindingInput & { id?: string };

const DECISION_IMPACT_MIN_LENGTH = 15;

export function saveFinding(
  attemptId: string,
  missionId: string,
  finding: FindingInput & { id?: string },
): FindingRow {
  if (finding.id) {
    const updated = updateFindingRow(attemptId, finding.id, finding);
    if (!updated) {
      throw new Error("Finding not found for this attempt.");
    }
    return updated;
  }
  if (!finding.title.trim()) {
    throw new Error("Finding title is required.");
  }
  const impact = finding.decisionImpact?.trim() ?? "";
  if (impact.length > 0 && impact.length < DECISION_IMPACT_MIN_LENGTH) {
    throw new Error(
      "Decision impact must explain who must act and by when (at least 15 characters).",
    );
  }
  return saveFindingRow(attemptId, missionId, finding);
}

export function getFindings(attemptId: string): FindingRow[] {
  return listFindings(attemptId);
}
