import { getDatabase } from "../sqlite.js";

export type FindingRow = {
  id: string;
  attemptId: string;
  missionId: string;
  title: string;
  severity: string;
  evidenceRefs: string | null;
  controlMapping: string | null;
  findingText: string | null;
  decisionImpact: string | null;
  recommendation: string | null;
  createdAt: string;
};

export type FindingInput = {
  title: string;
  severity: string;
  evidenceRefs?: string;
  controlMapping?: string;
  findingText?: string;
  decisionImpact?: string;
  recommendation?: string;
};

export function saveFinding(
  attemptId: string,
  missionId: string,
  finding: FindingInput,
): FindingRow {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDatabase()
    .prepare(
      `INSERT INTO findings (
        id, attempt_id, mission_id, title, severity, evidence_refs,
        control_mapping, finding_text, decision_impact, recommendation, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      attemptId,
      missionId,
      finding.title.trim(),
      finding.severity.trim().toUpperCase(),
      finding.evidenceRefs?.trim() ?? null,
      finding.controlMapping?.trim() ?? null,
      finding.findingText?.trim() ?? null,
      finding.decisionImpact?.trim() ?? null,
      finding.recommendation?.trim() ?? null,
      createdAt,
    );

  return {
    id,
    attemptId,
    missionId,
    title: finding.title.trim(),
    severity: finding.severity.trim().toUpperCase(),
    evidenceRefs: finding.evidenceRefs?.trim() ?? null,
    controlMapping: finding.controlMapping?.trim() ?? null,
    findingText: finding.findingText?.trim() ?? null,
    decisionImpact: finding.decisionImpact?.trim() ?? null,
    recommendation: finding.recommendation?.trim() ?? null,
    createdAt,
  };
}

export function updateFindingControl(findingId: string, controlId: string): boolean {
  const result = getDatabase()
    .prepare("UPDATE findings SET control_mapping = ? WHERE id = ?")
    .run(controlId, findingId);
  return result.changes > 0;
}

export function getFinding(attemptId: string, findingId: string): FindingRow | undefined {
  return getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, mission_id AS missionId, title, severity,
              evidence_refs AS evidenceRefs, control_mapping AS controlMapping,
              finding_text AS findingText, decision_impact AS decisionImpact,
              recommendation, created_at AS createdAt
       FROM findings
       WHERE attempt_id = ? AND id = ?`,
    )
    .get(attemptId, findingId) as FindingRow | undefined;
}

export function updateFinding(
  attemptId: string,
  findingId: string,
  finding: FindingInput,
): FindingRow | undefined {
  const existing = getFinding(attemptId, findingId);
  if (!existing) return undefined;

  getDatabase()
    .prepare(
      `UPDATE findings
       SET title = ?, severity = ?, evidence_refs = ?, control_mapping = ?,
           finding_text = ?, decision_impact = ?, recommendation = ?
       WHERE id = ? AND attempt_id = ?`,
    )
    .run(
      finding.title.trim(),
      finding.severity.trim().toUpperCase(),
      finding.evidenceRefs?.trim() ?? null,
      finding.controlMapping?.trim() ?? null,
      finding.findingText?.trim() ?? null,
      finding.decisionImpact?.trim() ?? null,
      finding.recommendation?.trim() ?? null,
      findingId,
      attemptId,
    );

  return getFinding(attemptId, findingId);
}

export function listFindings(attemptId: string): FindingRow[] {
  return getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, mission_id AS missionId, title, severity,
              evidence_refs AS evidenceRefs, control_mapping AS controlMapping,
              finding_text AS findingText, decision_impact AS decisionImpact,
              recommendation, created_at AS createdAt
       FROM findings
       WHERE attempt_id = ?
       ORDER BY created_at`,
    )
    .all(attemptId) as FindingRow[];
}
