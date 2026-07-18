import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function createScenarioSkeleton(systemId: string): string {
  const scenarioDir = join(process.cwd(), "data", "scenarios", systemId);
  if (existsSync(scenarioDir)) {
    throw new Error(`Scenario already exists: ${systemId}`);
  }

  const systemName = systemId.toUpperCase();
  mkdirSync(join(scenarioDir, "system"), { recursive: true });
  mkdirSync(join(scenarioDir, "missions"), { recursive: true });

  writeJson(join(scenarioDir, "scenario.json"), {
    scenarioId: systemId,
    systemName,
    name: systemName,
    title: `${systemName} IBM i Evidence Runtime`,
    industry: "Custom",
    description: "New scenario pack skeleton.",
    defaultMissionId: `${systemName.split("400")[0] ?? "LAB"}-001`,
    defaultUser: "AUDIT",
    defaultPassword: "TRAIN",
    defaultMenu: "AUDIT",
    version: "0.5.0",
  });

  writeJson(join(scenarioDir, "system", "users.json"), [
    {
      userName: "AUDIT",
      status: "*ENABLED",
      userClass: "*USER",
      text: "Training auditor profile",
      groupProfile: "AUDITGRP",
      specialAuthorities: "*AUDIT",
      initialMenu: "AUDIT",
      password: "TRAIN",
      lastSignon: "06/01/26",
    },
  ]);
  writeJson(join(scenarioDir, "system", "libraries.json"), [{ name: "QSYS" }, { name: "QGPL" }]);
  writeJson(join(scenarioDir, "system", "system_values.json"), [
    { name: "QSECURITY", value: "40", description: "Security level" },
  ]);
  writeJson(join(scenarioDir, "system", "objects.json"), []);
  writeJson(join(scenarioDir, "system", "object_authorities.json"), []);
  writeJson(join(scenarioDir, "system", "jobs.json"), []);
  writeJson(join(scenarioDir, "system", "job_logs.json"), []);
  writeJson(join(scenarioDir, "system", "message_queues.json"), []);
  writeJson(join(scenarioDir, "system", "spooled_files.json"), []);
  writeJson(join(scenarioDir, "system", "source_members.json"), []);
  writeJson(join(scenarioDir, "system", "ptf_groups.json"), []);
  writeJson(join(scenarioDir, "system", "ifs_entries.json"), []);

  return scenarioDir;
}

export function createMissionSkeleton(systemId: string, missionId: string): string {
  const missionDir = join(process.cwd(), "data", "scenarios", systemId, "missions", missionId);
  if (existsSync(missionDir)) {
    throw new Error(`Mission already exists: ${missionId}`);
  }
  mkdirSync(missionDir, { recursive: true });

  writeJson(join(missionDir, "mission.json"), {
    missionId,
    title: `${missionId} Mission`,
    briefing: "Describe the mission objective and evidence expectations.",
    persona: "IT auditor / GRC analyst",
  });
  writeFileSync(
    join(missionDir, "briefing.md"),
    `# ${missionId}\n\n## Objective\n\n## Evidence to collect\n\n## Expected controls\n`,
  );
  writeJson(join(missionDir, "coach.json"), { hints: ["Start with user profiles and system values."] });
  writeJson(join(missionDir, "evidence_requirements.json"), [
    { key: "user_profiles", description: "Review privileged user profiles.", optional: false },
  ]);
  writeJson(join(missionDir, "expected_findings.json"), []);
  writeJson(join(missionDir, "expected_remediation.json"), []);
  writeJson(join(missionDir, "scoring.json"), {
    weights: { evidenceCoverage: 0.35, issueIdentification: 0.25, controlInterpretation: 0.2, findingQuality: 0.2 },
  });
  writeFileSync(join(missionDir, "report_template.md"), `# ${missionId} Report\n\n## Findings\n\n## Remediation\n`);
  writeJson(join(missionDir, "variants.json"), []);

  return missionDir;
}

export function createCampaignSkeleton(campaignKey: string): string {
  const campaignId = campaignKey.toUpperCase().replace(/-/g, "-");
  const folder = join(process.cwd(), "data", "campaigns", campaignKey.toLowerCase());
  if (existsSync(folder)) {
    throw new Error(`Campaign already exists: ${campaignKey}`);
  }
  mkdirSync(folder, { recursive: true });

  writeJson(join(folder, "campaign.json"), {
    campaignId,
    title: campaignId.replace(/-/g, " "),
    description: "New campaign skeleton.",
    systems: ["claims400"],
    personaModes: ["auditor", "grc_analyst"],
    missions: [
      {
        missionId: "CLAIMS-001",
        systemId: "claims400",
        order: 1,
        required: true,
        unlockRule: "always",
      },
    ],
    completionCriteria: {
      requiredMissionsComplete: true,
      minimumAverageScore: 70,
      requiredArtifacts: ["finding_report", "evidence_packet"],
    },
  });
  writeJson(join(folder, "campaign_map.json"), { missions: ["CLAIMS-001"] });
  writeFileSync(
    join(folder, "campaign_report_template.md"),
    `# Campaign Report\n\n## Mission scores\n\n## Consolidated findings\n\n## Limitations\n`,
  );

  return folder;
}
