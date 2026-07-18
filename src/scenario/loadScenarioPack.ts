import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDenseRealismMode } from "../config/realismMode.js";
import type { Claims400Seed } from "../db/seedData.js";
import type { JobLogEntry } from "../ibmi-runtime/jobLogService.js";
import type { IfsLinkSeed } from "../ibmi-runtime/ifsLinkService.js";
import type { PhysicalFileSeed } from "../ibmi-runtime/physicalFileService.js";
import type { ProgramReference, SourceMember } from "../ibmi-runtime/sourceMemberService.js";
import type { SubsystemEntry } from "../ibmi-runtime/subsystemService.js";

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function resolvePackFile(packDir: string, nestedPath: string, flatName: string): string {
  const nested = join(packDir, nestedPath);
  if (existsSync(nested)) return nested;
  return join(packDir, flatName);
}

function readJsonl<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function resolveScenarioPackDir(scenarioId: string): string {
  const fromEnv = process.env.SCENARIO_PACK_ROOT;
  if (fromEnv) {
    return join(fromEnv, scenarioId);
  }
  return join(process.cwd(), "data", "scenarios", scenarioId);
}

export function loadScenarioPack(scenarioId = process.env.SCENARIO_ID ?? "claims400"): Claims400Seed {
  const packDir = resolveScenarioPackDir(scenarioId);
  if (!existsSync(join(packDir, "scenario.json"))) {
    throw new Error(`Scenario pack not found: ${packDir}`);
  }

  const system = readJson<{ name: string; description: string }>(join(packDir, "scenario.json"), {
    name: "CLAIMS400",
    description: "",
  });

  const missionsFile = readJson<{
    missions?: Claims400Seed["missions"];
    missionEvidenceRequirements?: Claims400Seed["missionEvidenceRequirements"];
    missionExpectedFindings?: Claims400Seed["missionExpectedFindings"];
  }>(join(packDir, "missions.json"), {});

  const jobs = readJson<Claims400Seed["jobs"]>(join(packDir, "jobs.json"), []);
  const denseJobs = isDenseRealismMode()
    ? readJson<Claims400Seed["jobs"]>(join(packDir, "jobs.dense.json"), [])
    : [];

  return {
    system,
    libraries: readJson<string[]>(resolvePackFile(packDir, "system/libraries.json", "libraries.json"), []),
    userProfiles: readJson<Claims400Seed["userProfiles"]>(
      resolvePackFile(packDir, "system/users.json", "users.json"),
      [],
    ),
    systemValues: readJson<Claims400Seed["systemValues"]>(
      resolvePackFile(packDir, "system/system_values.json", "system_values.json"),
      [],
    ),
    objects: readJson<Claims400Seed["objects"]>(resolvePackFile(packDir, "system/objects.json", "objects.json"), []),
    objectAuthorities: readJson<NonNullable<Claims400Seed["objectAuthorities"]>>(
      resolvePackFile(packDir, "system/object_authorities.json", "object_authorities.json"),
      [],
    ),
    auditJournalEntries: readJsonl<Claims400Seed["auditJournalEntries"][number]>(
      resolvePackFile(packDir, "system/audit_journal.jsonl", "audit_journal.jsonl"),
    ),
    jobs: [...jobs, ...denseJobs],
    jobLogs: readJson<JobLogEntry[]>(resolvePackFile(packDir, "system/job_logs.json", "job_logs.json"), []),
    subsystems: readJson<SubsystemEntry[]>(
      resolvePackFile(packDir, "system/subsystems.json", "subsystems.json"),
      [],
    ),
    spooledFiles: readJson<Claims400Seed["spooledFiles"]>(
      resolvePackFile(packDir, "system/spooled_files.json", "spooled_files.json"),
      [],
    ),
    physicalFiles: readJson<PhysicalFileSeed[]>(
      resolvePackFile(packDir, "system/physical_files.json", "physical_files.json"),
      [],
    ),
    ifsLinks: readJson<IfsLinkSeed[]>(resolvePackFile(packDir, "system/ifs_links.json", "ifs_links.json"), []),
    sourceMembers: isDenseRealismMode()
      ? readJson<SourceMember[]>(join(packDir, "source_members.json"), [])
      : readJson<SourceMember[]>(join(packDir, "source_members.json"), []).slice(0, 4),
    programReferences: readJson<ProgramReference[]>(join(packDir, "program_references.json"), []),
    missions: missionsFile.missions ?? [],
    missionEvidenceRequirements: missionsFile.missionEvidenceRequirements ?? [],
    missionExpectedFindings: missionsFile.missionExpectedFindings ?? [],
  };
}

export function loadCommandCatalogOverrides(
  scenarioId = process.env.SCENARIO_ID ?? "claims400",
): unknown[] {
  const packDir = resolveScenarioPackDir(scenarioId);
  return readJson<unknown[]>(join(packDir, "command_catalog_overrides.json"), []);
}
