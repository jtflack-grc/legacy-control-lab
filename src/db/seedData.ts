import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { getSchemaMeta, setSchemaMeta } from "./schemaMeta.js";
import { reloadJobLogCatalog } from "../ibmi-runtime/jobLogService.js";
import { reloadPhysicalFileCatalog, type PhysicalFileSeed } from "../ibmi-runtime/physicalFileService.js";
import { reloadIfsLinkCatalog, type IfsLinkSeed } from "../ibmi-runtime/ifsLinkService.js";
import {
  reloadProgramReferenceCatalog,
  reloadSourceMemberCatalog,
  type ProgramReference,
  type SourceMember,
} from "../ibmi-runtime/sourceMemberService.js";
import { reloadSubsystemCatalog, type SubsystemEntry } from "../ibmi-runtime/subsystemService.js";
import type { JobLogEntry } from "../ibmi-runtime/jobLogService.js";
import { resetBackupState } from "../ibmi-runtime/backupService.js";
import { loadScenarioPack } from "../scenario/loadScenarioPack.js";
import { loadRangeSystems } from "../range/loadRangeRegistry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Claims400Seed = {
  system: { name: string; description: string };
  libraries: string[];
  userProfiles: Array<{
    userName: string;
    status: string;
    userClass: string;
    text: string;
    groupProfile?: string;
    specialAuthorities?: string;
    initialMenu?: string;
    password?: string;
    lastSignon?: string;
    businessOwner?: string;
    limitCapabilities?: string;
    activityProfileExempt?: boolean;
  }>;
  systemValues: Array<{
    name: string;
    value: string;
    category: string;
    description: string;
  }>;
  objects: Array<{
    library: string;
    name: string;
    objectType: string;
    owner?: string;
    textDescription?: string;
    publicAuthority?: string;
  }>;
  auditJournalEntries: Array<{
    entryTime: string;
    userName: string;
    entryType: string;
    objectRef?: string;
    message?: string;
  }>;
  jobs: Array<{
    jobNumber: string;
    userName: string;
    jobName: string;
    jobType: string;
    subsystem: string;
    status: string;
    jobDescription?: string;
    outputQueue?: string;
  }>;
  spooledFiles: Array<{
    fileName: string;
    userName: string;
    spoolNumber: string;
    status: string;
  }>;
  objectAuthorities?: Array<{
    library: string;
    object: string;
    userName: string;
    authority: string;
  }>;
  missions?: Array<{
    id: string;
    title: string;
    briefing: string;
    persona?: string;
  }>;
  missionEvidenceRequirements?: Array<{
    missionId: string;
    key: string;
    description: string;
    commandPattern: string;
    optional?: boolean;
    weight?: number;
  }>;
  missionExpectedFindings?: Array<{
    missionId: string;
    key: string;
    description: string;
    matchPatterns: string[];
    weight?: number;
  }>;
  physicalFiles?: PhysicalFileSeed[];
  ifsLinks?: IfsLinkSeed[];
  jobLogs?: JobLogEntry[];
  subsystems?: SubsystemEntry[];
  sourceMembers?: SourceMember[];
  programReferences?: ProgramReference[];
};

export function loadClaims400Seed(): Claims400Seed {
  return loadScenarioPack(process.env.SCENARIO_ID ?? "claims400");
}

function systemIdForScenario(scenarioId: string): string {
  return `sys-${scenarioId.toLowerCase()}`;
}

function insertSystemSeed(db: SqliteDatabase, systemId: string, seed: Claims400Seed): void {
  db.prepare("INSERT INTO systems (id, name, description) VALUES (?, ?, ?)").run(
    systemId,
    seed.system.name,
    seed.system.description,
  );

    const insertLibrary = db.prepare(
      "INSERT INTO libraries (id, system_id, name) VALUES (?, ?, ?)",
    );
    for (const name of seed.libraries) {
      insertLibrary.run(`lib-${systemId}-${name.toLowerCase()}`, systemId, name);
    }

    const insertProfile = db.prepare(`
      INSERT INTO user_profiles (
        id, system_id, user_name, status, user_class, text_description,
        group_profile, special_authorities, initial_menu, password, last_signon, business_owner,
        limit_capabilities, activity_profile_exempt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const profile of seed.userProfiles) {
      insertProfile.run(
        `usr-${systemId}-${profile.userName.toLowerCase()}`,
        systemId,
        profile.userName,
        profile.status,
        profile.userClass,
        profile.text,
        profile.groupProfile ?? null,
        profile.specialAuthorities ?? null,
        profile.initialMenu ?? "AUDIT",
        profile.password ?? null,
        profile.lastSignon ?? null,
        profile.businessOwner ?? null,
        profile.limitCapabilities ?? "*NO",
        profile.activityProfileExempt ? 1 : 0,
      );
    }

    const insertSysVal = db.prepare(`
      INSERT INTO system_values (id, system_id, name, value, category, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const value of seed.systemValues) {
      insertSysVal.run(
        `sv-${systemId}-${value.name.toLowerCase()}`,
        systemId,
        value.name,
        value.value,
        value.category,
        value.description,
      );
    }

    const insertObject = db.prepare(`
      INSERT INTO objects (
        id, system_id, library, name, object_type, owner, text_description, public_authority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const obj of seed.objects) {
      insertObject.run(
        `obj-${systemId}-${obj.library.toLowerCase()}-${obj.name.toLowerCase()}`,
        systemId,
        obj.library,
        obj.name,
        obj.objectType,
        obj.owner ?? null,
        obj.textDescription ?? null,
        obj.publicAuthority ?? null,
      );
    }

    const insertJournal = db.prepare(`
      INSERT INTO audit_journal_entries (
        id, system_id, entry_time, user_name, entry_type, object_ref, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seed.auditJournalEntries.forEach((entry, index) => {
      insertJournal.run(
        `jrn-${systemId}-${index + 1}`,
        systemId,
        entry.entryTime,
        entry.userName,
        entry.entryType,
        entry.objectRef ?? null,
        entry.message ?? null,
      );
    });

    const insertJob = db.prepare(`
      INSERT INTO jobs (
        id, system_id, job_number, user_name, job_name, job_type,
        subsystem, status, job_description, output_queue
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const job of seed.jobs) {
      insertJob.run(
        `job-${systemId}-${job.jobNumber}`,
        systemId,
        job.jobNumber,
        job.userName,
        job.jobName,
        job.jobType,
        job.subsystem,
        job.status,
        job.jobDescription ?? null,
        job.outputQueue ?? null,
      );
    }

    const insertSpool = db.prepare(`
      INSERT INTO spooled_files (id, system_id, file_name, user_name, spool_number, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    seed.spooledFiles.forEach((file, index) => {
      insertSpool.run(
        `spl-${systemId}-${index + 1}`,
        systemId,
        file.fileName,
        file.userName,
        file.spoolNumber,
        file.status,
      );
    });

    const insertObjAut = db.prepare(`
      INSERT INTO object_authorities (id, system_id, library, object_name, user_name, authority)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const grant of seed.objectAuthorities ?? []) {
      insertObjAut.run(
        `objaut-${systemId}-${grant.library.toLowerCase()}-${grant.object.toLowerCase()}-${grant.userName.toLowerCase()}`,
        systemId,
        grant.library,
        grant.object,
        grant.userName,
        grant.authority,
      );
    }

    const insertMission = db.prepare(`
      INSERT INTO missions (id, title, briefing, system_id, persona) VALUES (?, ?, ?, ?, ?)
    `);
    for (const mission of seed.missions ?? []) {
      insertMission.run(mission.id, mission.title, mission.briefing, systemId, mission.persona ?? null);
    }

    const insertEvidenceReq = db.prepare(`
      INSERT INTO mission_evidence_requirements (
        id, mission_id, requirement_key, description, command_pattern, optional, weight
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const req of seed.missionEvidenceRequirements ?? []) {
      insertEvidenceReq.run(
        `mereq-${req.missionId}-${req.key}`,
        req.missionId,
        req.key,
        req.description,
        req.commandPattern,
        req.optional ? 1 : 0,
        req.weight ?? 1,
      );
    }

    const insertExpectedFinding = db.prepare(`
      INSERT INTO mission_expected_findings (
        id, mission_id, finding_key, description, match_patterns, weight
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const expected of seed.missionExpectedFindings ?? []) {
      insertExpectedFinding.run(
        `mexp-${expected.missionId}-${expected.key}`,
        expected.missionId,
        expected.key,
        expected.description,
        JSON.stringify(expected.matchPatterns),
        expected.weight ?? 1,
      );
    }
}

export function clearSystemData(db: SqliteDatabase, systemId: string): void {
  db.prepare(
    `DELETE FROM findings
     WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`,
  ).run(systemId);
  db.prepare(`DELETE FROM runtime_coach_events WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM runtime_job_log_entries WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM runtime_generated_audit WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM runtime_state_changes WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM runtime_command_history WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM runtime_attempt_baselines WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM mission_evidence_tags WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM mission_evidence_collected WHERE attempt_id IN (SELECT id FROM mission_attempts WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM mission_attempts WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM findings WHERE mission_id IN (SELECT id FROM missions WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM mission_expected_findings WHERE mission_id IN (SELECT id FROM missions WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM mission_evidence_requirements WHERE mission_id IN (SELECT id FROM missions WHERE system_id = ?)`).run(systemId);
  db.prepare(`DELETE FROM missions WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM object_authorities WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM spooled_files WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM jobs WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM audit_journal_entries WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM system_values WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM objects WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM user_profiles WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM libraries WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM catalog_lab_entities WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM lab_outfile_rows WHERE system_id = ?`).run(systemId);
  db.prepare(`DELETE FROM systems WHERE id = ?`).run(systemId);
}

export function seedScenarioPack(db: SqliteDatabase, scenarioId: string, seed: Claims400Seed = loadScenarioPack(scenarioId)): void {
  const systemId = systemIdForScenario(scenarioId);
  const seedOne = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM systems WHERE id = ? OR name = ?").get(systemId, seed.system.name) as
      | { id: string }
      | undefined;
    if (existing) {
      clearSystemData(db, existing.id);
    }
    insertSystemSeed(db, systemId, seed);
  });
  seedOne();

  reloadPhysicalFileCatalog(seed.system.name, seed.physicalFiles ?? []);
  reloadIfsLinkCatalog(seed.system.name, seed.ifsLinks ?? []);
  reloadJobLogCatalog(seed.system.name, seed.jobLogs ?? []);
  reloadSubsystemCatalog(seed.system.name, seed.subsystems ?? []);
  reloadSourceMemberCatalog(seed.system.name, seed.sourceMembers ?? []);
  reloadProgramReferenceCatalog(seed.system.name, seed.programReferences ?? []);
  resetBackupState(seed.system.name);
}

export function seedClaims400(db: SqliteDatabase, seed: Claims400Seed = loadClaims400Seed()): void {
  clearScenarioData(db);
  seedScenarioPack(db, "claims400", seed);
}

export const SCENARIO_VERSION = "0.5.3";
const SCENARIO_VERSION_KEY = "scenario_version";
const RANGE_VERSION_KEY = "range_version";

export function isScenarioComplete(db: SqliteDatabase): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM missions m
       JOIN systems s ON s.id = m.system_id
       WHERE s.name = 'CLAIMS400'`,
    )
    .get() as { count: number };
  return row.count > 0;
}

export function isRangeComplete(db: SqliteDatabase): boolean {
  const systems = loadRangeSystems().filter((entry) => entry.status === "active");
  if (systems.length === 0) return isScenarioComplete(db);
  return systems.every((entry) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM missions m
         JOIN systems s ON s.id = m.system_id
         WHERE s.name = ?`,
      )
      .get(entry.systemName) as { count: number };
    return row.count > 0;
  });
}

/** Re-seed all active range systems when version changes or data is missing. */
export function syncRangeIfNeeded(db: SqliteDatabase, force = false): void {
  const storedVersion = getSchemaMeta(db, RANGE_VERSION_KEY);
  if (!force && storedVersion === SCENARIO_VERSION && isRangeComplete(db)) {
    return;
  }

  for (const system of loadRangeSystems().filter((entry) => entry.status === "active")) {
    seedScenarioPack(db, system.systemId);
  }

  setSchemaMeta(db, SCENARIO_VERSION_KEY, SCENARIO_VERSION);
  setSchemaMeta(db, RANGE_VERSION_KEY, SCENARIO_VERSION);
  console.log(`[db] synced range scenarios to ${SCENARIO_VERSION}`);
}

/** Re-seed CLAIMS400 when the scenario version changes or mission data is missing. */
export function syncScenarioIfNeeded(db: SqliteDatabase, force = false): void {
  syncRangeIfNeeded(db, force);
}

/** Clear mutable runtime state between trainer probes without dropping scenario seed data. */
export function clearTrainerProbeState(db: SqliteDatabase): void {
  db.exec(`
    DELETE FROM findings;
    DELETE FROM runtime_coach_events;
    DELETE FROM runtime_job_log_entries;
    DELETE FROM runtime_generated_audit;
    DELETE FROM runtime_state_changes;
    DELETE FROM runtime_command_history;
    DELETE FROM runtime_attempt_baselines;
    DELETE FROM mission_evidence_tags;
    DELETE FROM mission_evidence_collected;
    DELETE FROM scorebook_entries;
    DELETE FROM mission_attempts;
    DELETE FROM sessions;
  `);
}

function clearScenarioData(db: SqliteDatabase): void {
  db.exec(`
    DELETE FROM findings;
    DELETE FROM runtime_coach_events;
    DELETE FROM runtime_job_log_entries;
    DELETE FROM runtime_generated_audit;
    DELETE FROM runtime_state_changes;
    DELETE FROM runtime_command_history;
    DELETE FROM runtime_attempt_baselines;
    DELETE FROM mission_evidence_tags;
    DELETE FROM mission_evidence_collected;
    DELETE FROM scorebook_entries;
    DELETE FROM mission_attempts;
    DELETE FROM mission_expected_findings;
    DELETE FROM mission_evidence_requirements;
    DELETE FROM object_authorities;
    DELETE FROM missions;
    DELETE FROM spooled_files;
    DELETE FROM jobs;
    DELETE FROM audit_journal_entries;
    DELETE FROM system_values;
    DELETE FROM objects;
    DELETE FROM user_profiles;
    DELETE FROM libraries;
    DELETE FROM catalog_lab_entities;
    DELETE FROM lab_outfile_rows;
    DELETE FROM sessions;
    DELETE FROM systems;
  `);
}
