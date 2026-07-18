import type { PlaybookPath } from "../missions/missionGamification.js";

export type SkillPathId = "governance" | "blueteam" | "redteam" | "operator" | "demo" | "iongrc";

export type SkillPathConfig = {
  id: SkillPathId;
  label: string;
  kicker: string;
  title: string;
  description: string;
  user: string;
  missionId?: string;
  campaignId?: string;
  playbookPath?: PlaybookPath;
  /** Lane stored in lab.lane.choice for shell preload */
  storageLane: "auditor" | "operator";
};

export const SKILL_PATHS: Record<SkillPathId, SkillPathConfig> = {
  governance: {
    id: "governance",
    label: "Prove the control claim",
    kicker: "Skill path · Access governance",
    title: "Prove the control claim",
    description: "Campaign missions · ~45–60 min each · Beginner friendly",
    user: "AUDIT",
    missionId: "CLAIMS-001",
    campaignId: "IBM-I-ACCESS-GOVERNANCE",
    storageLane: "auditor",
  },
  blueteam: {
    id: "blueteam",
    label: "Blue Team — detect",
    kicker: "Skill path · Detect & respond",
    title: "Blue Team — detect",
    description: "WRKACTJOB, journals, job logs · scored CLAIMS-005",
    user: "AUDIT",
    missionId: "CLAIMS-005",
    campaignId: "RED-BLUE-DETECT-RESPOND",
    playbookPath: "blueteam",
    storageLane: "auditor",
  },
  redteam: {
    id: "redteam",
    label: "Red Team — boundaries",
    kicker: "Skill path · Adversarial boundaries",
    title: "Red Team — boundaries",
    description: "APCLERK escape attempts · document denials · CLAIMS-007",
    user: "APCLERK",
    missionId: "CLAIMS-007",
    campaignId: "RED-TEAM-STANDALONE",
    playbookPath: "redteam",
    storageLane: "auditor",
  },
  operator: {
    id: "operator",
    label: "Privileged operations",
    kicker: "Skill path · Privileged operations",
    title: "Operate privileged authority",
    description: "SECURITY menu · state changes · audit side effects",
    user: "QSECOFR",
    missionId: "OPERATOR-SESSION",
    storageLane: "operator",
  },
  demo: {
    id: "demo",
    label: "Five-Minute Demo",
    kicker: "Showroom · No scoring",
    title: "Five-Minute Demo",
    description: "Product walkthrough — step-by-step in the right panel",
    user: "DEMO",
    storageLane: "auditor",
  },
  iongrc: {
    id: "iongrc",
    label: "i on GRC practice desk",
    kicker: "Article packs · No scoring",
    title: "i on GRC practice desk",
    description: "i on GRC articles on the stock IBM i Main Menu — IONGRC / IONGRC",
    user: "IONGRC",
    storageLane: "auditor",
  },
};

export function isSkillPathId(value: string | null | undefined): value is SkillPathId {
  return value != null && value in SKILL_PATHS;
}

export function missionIdForSkillPath(skillPath?: SkillPathId | null): string | undefined {
  if (!skillPath) return undefined;
  return SKILL_PATHS[skillPath].missionId;
}

export function campaignIdForSkillPath(skillPath?: SkillPathId | null): string | undefined {
  if (!skillPath) return undefined;
  return SKILL_PATHS[skillPath].campaignId;
}
