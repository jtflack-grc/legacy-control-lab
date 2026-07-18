import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type ScorebookEntryRow = {
  id: string;
  attemptId: string | null;
  systemName: string;
  campaignId: string | null;
  missionId: string;
  variantId: string | null;
  personaId: string | null;
  guidanceMode: string | null;
  userName: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  totalScore: number | null;
  evidenceCoverage: number | null;
  findingsCount: number | null;
  remediationCount: number | null;
  reportPath: string | null;
  evidencePacketPath: string | null;
};

export function upsertScorebookEntry(entry: {
  attemptId: string;
  systemName: string;
  campaignId?: string;
  missionId: string;
  variantId?: string;
  personaId?: string;
  guidanceMode?: string;
  userName: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  totalScore?: number;
  evidenceCoverage?: number;
  findingsCount?: number;
  remediationCount?: number;
  reportPath?: string;
  evidencePacketPath?: string;
}): void {
  const systemId = getSystemIdByName(entry.systemName);
  const id = `sb-${entry.attemptId}`;
  getDatabase()
    .prepare(
      `INSERT INTO scorebook_entries (
        id, attempt_id, system_id, system_name, campaign_id, mission_id, variant_id,
        persona_id, guidance_mode, user_name, started_at, completed_at, status,
        total_score, evidence_coverage, findings_count, remediation_count,
        report_path, evidence_packet_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        completed_at = excluded.completed_at,
        status = excluded.status,
        total_score = excluded.total_score,
        evidence_coverage = excluded.evidence_coverage,
        findings_count = excluded.findings_count,
        remediation_count = excluded.remediation_count,
        report_path = excluded.report_path,
        evidence_packet_path = excluded.evidence_packet_path`,
    )
    .run(
      id,
      entry.attemptId,
      systemId,
      entry.systemName,
      entry.campaignId ?? null,
      entry.missionId,
      entry.variantId ?? null,
      entry.personaId ?? null,
      entry.guidanceMode ?? null,
      entry.userName,
      entry.startedAt,
      entry.completedAt ?? null,
      entry.status,
      entry.totalScore ?? null,
      entry.evidenceCoverage ?? null,
      entry.findingsCount ?? null,
      entry.remediationCount ?? null,
      entry.reportPath ?? null,
      entry.evidencePacketPath ?? null,
    );
}

export function listScorebookEntries(userName?: string): ScorebookEntryRow[] {
  const rows = userName
    ? (getDatabase()
        .prepare(
          `SELECT id, attempt_id AS attemptId, system_name AS systemName, campaign_id AS campaignId,
                  mission_id AS missionId, variant_id AS variantId, persona_id AS personaId,
                  guidance_mode AS guidanceMode, user_name AS userName, started_at AS startedAt,
                  completed_at AS completedAt, status, total_score AS totalScore,
                  evidence_coverage AS evidenceCoverage, findings_count AS findingsCount,
                  remediation_count AS remediationCount, report_path AS reportPath,
                  evidence_packet_path AS evidencePacketPath
           FROM scorebook_entries
           WHERE user_name = ?
           ORDER BY started_at DESC`,
        )
        .all(userName.toUpperCase()) as ScorebookEntryRow[])
    : (getDatabase()
        .prepare(
          `SELECT id, attempt_id AS attemptId, system_name AS systemName, campaign_id AS campaignId,
                  mission_id AS missionId, variant_id AS variantId, persona_id AS personaId,
                  guidance_mode AS guidanceMode, user_name AS userName, started_at AS startedAt,
                  completed_at AS completedAt, status, total_score AS totalScore,
                  evidence_coverage AS evidenceCoverage, findings_count AS findingsCount,
                  remediation_count AS remediationCount, report_path AS reportPath,
                  evidence_packet_path AS evidencePacketPath
           FROM scorebook_entries
           ORDER BY started_at DESC`,
        )
        .all() as ScorebookEntryRow[]);
  return rows;
}

export function getCompletedMissionScore(
  userName: string,
  missionId: string,
): ScorebookEntryRow | undefined {
  return getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, system_name AS systemName, campaign_id AS campaignId,
              mission_id AS missionId, variant_id AS variantId, persona_id AS personaId,
              guidance_mode AS guidanceMode, user_name AS userName, started_at AS startedAt,
              completed_at AS completedAt, status, total_score AS totalScore,
              evidence_coverage AS evidenceCoverage, findings_count AS findingsCount,
              remediation_count AS remediationCount, report_path AS reportPath,
              evidence_packet_path AS evidencePacketPath
       FROM scorebook_entries
       WHERE user_name = ? AND mission_id = ? AND status = 'complete'
       ORDER BY completed_at DESC
       LIMIT 1`,
    )
    .get(userName.toUpperCase(), missionId) as ScorebookEntryRow | undefined;
}
