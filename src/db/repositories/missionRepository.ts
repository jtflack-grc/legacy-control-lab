import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type MissionRow = {
  id: string;
  title: string;
  briefing: string;
  persona: string | null;
};

export type EvidenceRequirementRow = {
  requirementKey: string;
  description: string;
  commandPattern: string;
  optional: boolean;
  weight: number;
};

export type ExpectedFindingRow = {
  findingKey: string;
  description: string;
  matchPatterns: string[];
  weight: number;
};

export type MissionAttemptRow = {
  id: string;
  missionId: string;
  systemId: string;
  userName: string;
  startedAt: string;
  submittedAt: string | null;
  evidenceScore: number | null;
  issuesScore: number | null;
  interpretationScore: number | null;
  findingQualityScore: number | null;
  totalScore: number | null;
};

export type CollectedEvidenceRow = {
  requirementKey: string;
  commandText: string;
  collectedAt: string;
};

export function getMission(systemName: string, missionId: string): MissionRow | undefined {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare("SELECT id, title, briefing, persona FROM missions WHERE system_id = ? AND id = ?")
    .get(systemId, missionId) as MissionRow | undefined;
}

export function listMissions(systemName: string): MissionRow[] {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare("SELECT id, title, briefing, persona FROM missions WHERE system_id = ? ORDER BY id")
    .all(systemId) as MissionRow[];
}

export function getDefaultMission(systemName: string): MissionRow | undefined {
  return listMissions(systemName)[0];
}

/** Ensure a server-owned internal mission definition exists without replacing scenario content. */
export function ensureInternalMission(
  systemName: string,
  mission: { id: string; title: string; briefing: string; persona: string },
): MissionRow {
  const systemId = getSystemIdByName(systemName);
  getDatabase().prepare(`INSERT OR IGNORE INTO missions (id,title,briefing,system_id,persona)
    VALUES (@id,@title,@briefing,@systemId,@persona)`).run({ ...mission, systemId });
  const stored = getMission(systemName, mission.id);
  if (!stored) throw new Error(`Mission ${mission.id} exists outside ${systemName}`);
  return stored;
}

export function listEvidenceRequirements(missionId: string): EvidenceRequirementRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT requirement_key AS requirementKey, description, command_pattern AS commandPattern,
              optional, weight
       FROM mission_evidence_requirements
       WHERE mission_id = ?
       ORDER BY requirement_key`,
    )
    .all(missionId) as Array<{
    requirementKey: string;
    description: string;
    commandPattern: string;
    optional: number;
    weight: number;
  }>;

  return rows.map((row) => ({
    requirementKey: row.requirementKey,
    description: row.description,
    commandPattern: row.commandPattern,
    optional: row.optional === 1,
    weight: row.weight,
  }));
}

export function listExpectedFindings(missionId: string): ExpectedFindingRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT finding_key AS findingKey, description, match_patterns AS matchPatterns, weight
       FROM mission_expected_findings
       WHERE mission_id = ?
       ORDER BY finding_key`,
    )
    .all(missionId) as Array<{
    findingKey: string;
    description: string;
    matchPatterns: string;
    weight: number;
  }>;

  return rows.map((row) => ({
    findingKey: row.findingKey,
    description: row.description,
    matchPatterns: JSON.parse(row.matchPatterns) as string[],
    weight: row.weight,
  }));
}

export function createMissionAttempt(
  systemName: string,
  missionId: string,
  userName: string,
  sessionId: string,
  meta: {
    campaignId?: string;
    personaId?: string;
    guidanceMode?: string;
    variantId?: string;
  } = {},
): MissionAttemptRow {
  const systemId = getSystemIdByName(systemName);
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  getDatabase()
    .prepare(
      `INSERT INTO mission_attempts (
        id, mission_id, system_id, session_id, user_name, started_at,
        campaign_id, persona_id, guidance_mode, variant_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      missionId,
      systemId,
      sessionId,
      userName,
      startedAt,
      meta.campaignId ?? null,
      meta.personaId ?? null,
      meta.guidanceMode ?? null,
      meta.variantId ?? null,
    );

  return {
    id,
    missionId,
    systemId,
    userName,
    startedAt,
    submittedAt: null,
    evidenceScore: null,
    issuesScore: null,
    interpretationScore: null,
    findingQualityScore: null,
    totalScore: null,
  };
}

export function getLatestActiveMissionAttempt(
  systemName: string,
  userName: string,
): MissionAttemptRow | undefined {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT id, mission_id AS missionId, system_id AS systemId, user_name AS userName,
              started_at AS startedAt, submitted_at AS submittedAt,
              evidence_score AS evidenceScore, issues_score AS issuesScore,
              interpretation_score AS interpretationScore,
              finding_quality_score AS findingQualityScore, total_score AS totalScore
       FROM mission_attempts
       WHERE system_id = ? AND user_name = ? AND submitted_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(systemId, userName.trim().toUpperCase()) as MissionAttemptRow | undefined;
}

export function getLatestMissionAttempt(
  systemName: string,
  userName: string,
): MissionAttemptRow | undefined {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT id, mission_id AS missionId, system_id AS systemId, user_name AS userName,
              started_at AS startedAt, submitted_at AS submittedAt,
              evidence_score AS evidenceScore, issues_score AS issuesScore,
              interpretation_score AS interpretationScore,
              finding_quality_score AS findingQualityScore, total_score AS totalScore
       FROM mission_attempts
       WHERE system_id = ? AND user_name = ?
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(systemId, userName.trim().toUpperCase()) as MissionAttemptRow | undefined;
}

export function getSubmittedMissionScore(
  systemName: string,
  userName: string,
  missionId: string,
): { totalScore: number | null } | undefined {
  let systemId: string;
  try {
    systemId = getSystemIdByName(systemName);
  } catch {
    return undefined;
  }
  return getDatabase()
    .prepare(
      `SELECT total_score AS totalScore
       FROM mission_attempts
       WHERE system_id = ? AND user_name = ? AND mission_id = ? AND submitted_at IS NOT NULL
       ORDER BY submitted_at DESC
       LIMIT 1`,
    )
    .get(systemId, userName.trim().toUpperCase(), missionId.toUpperCase()) as
    | { totalScore: number | null }
    | undefined;
}

export function getActiveMissionAttempt(
  systemName: string,
  userName: string,
  missionId: string,
): MissionAttemptRow | undefined {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(
      `SELECT id, mission_id AS missionId, system_id AS systemId, user_name AS userName,
              started_at AS startedAt, submitted_at AS submittedAt,
              evidence_score AS evidenceScore, issues_score AS issuesScore,
              interpretation_score AS interpretationScore,
              finding_quality_score AS findingQualityScore, total_score AS totalScore
       FROM mission_attempts
       WHERE system_id = ? AND user_name = ? AND mission_id = ? AND submitted_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(systemId, userName.trim().toUpperCase(), missionId) as MissionAttemptRow | undefined;
  return row;
}

export function getMissionAttempt(attemptId: string): MissionAttemptRow | undefined {
  return getDatabase()
    .prepare(
      `SELECT id, mission_id AS missionId, system_id AS systemId, user_name AS userName,
              started_at AS startedAt, submitted_at AS submittedAt,
              evidence_score AS evidenceScore, issues_score AS issuesScore,
              interpretation_score AS interpretationScore,
              finding_quality_score AS findingQualityScore, total_score AS totalScore
       FROM mission_attempts WHERE id = ?`,
    )
    .get(attemptId) as MissionAttemptRow | undefined;
}

export function recordEvidenceTag(attemptId: string, tag: string, commandText: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO mission_evidence_tags (id, attempt_id, tag, command_text, collected_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(attempt_id, tag) DO NOTHING`,
    )
    .run(crypto.randomUUID(), attemptId, tag, commandText, new Date().toISOString());
}

export function listEvidenceTags(attemptId: string): string[] {
  const rows = getDatabase()
    .prepare(`SELECT tag FROM mission_evidence_tags WHERE attempt_id = ? ORDER BY collected_at`)
    .all(attemptId) as Array<{ tag: string }>;
  return rows.map((row) => row.tag);
}

export function recordCollectedEvidence(
  attemptId: string,
  requirementKey: string,
  commandText: string,
): void {
  getDatabase()
    .prepare(
      `INSERT INTO mission_evidence_collected (id, attempt_id, requirement_key, command_text, collected_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(attempt_id, requirement_key) DO NOTHING`,
    )
    .run(crypto.randomUUID(), attemptId, requirementKey, commandText, new Date().toISOString());
}

export function listCollectedEvidence(attemptId: string): CollectedEvidenceRow[] {
  return getDatabase()
    .prepare(
      `SELECT requirement_key AS requirementKey, command_text AS commandText, collected_at AS collectedAt
       FROM mission_evidence_collected
       WHERE attempt_id = ?
       ORDER BY collected_at`,
    )
    .all(attemptId) as CollectedEvidenceRow[];
}

export function saveAttemptScores(
  attemptId: string,
  scores: {
    evidenceScore: number;
    issuesScore: number;
    interpretationScore: number;
    findingQualityScore: number;
    totalScore: number;
  },
): void {
  getDatabase()
    .prepare(
      `UPDATE mission_attempts
       SET submitted_at = ?, evidence_score = ?, issues_score = ?,
           interpretation_score = ?, finding_quality_score = ?, total_score = ?
       WHERE id = ?`,
    )
    .run(
      new Date().toISOString(),
      scores.evidenceScore,
      scores.issuesScore,
      scores.interpretationScore,
      scores.findingQualityScore,
      scores.totalScore,
      attemptId,
    );
}

export function deleteMissionAttemptCascade(attemptId: string): void {
  const db = getDatabase();
  db.prepare(`DELETE FROM findings WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_coach_events WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_job_log_entries WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_generated_audit WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_state_changes WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_command_history WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM runtime_attempt_baselines WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM mission_evidence_tags WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM mission_evidence_collected WHERE attempt_id = ?`).run(attemptId);
  db.prepare(`DELETE FROM mission_attempts WHERE id = ?`).run(attemptId);
}
