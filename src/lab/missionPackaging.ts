export type SkillPathId =
  | "access-governance"
  | "detect-respond"
  | "privileged-ops"
  | "adversarial";

export type MissionPackaging = {
  skillPathId: SkillPathId;
  skillPathLabel: string;
  stakes: string;
  durationLabel: string;
  difficulty: "Beginner" | "Intermediate";
};

export type AchievementBadge = {
  id: string;
  label: string;
  earned: boolean;
};

const SKILL_PATHS: Record<SkillPathId, string> = {
  "access-governance": "Skill path · Access governance",
  "detect-respond": "Skill path · Detect & respond",
  "privileged-ops": "Skill path · Privileged operations",
  "adversarial": "Skill path · Adversarial boundaries",
};

const MISSION_PACKAGING: Record<string, Omit<MissionPackaging, "durationLabel"> & { durationMin: number }> = {
  "CLAIMS-001": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "The CISO needs a defensible answer before the quarterly access review closes.",
    difficulty: "Beginner",
    durationMin: 45,
  },
  "CLAIMS-002": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "OLDVENDOR is still enabled — procurement expects proof of 90-day offboarding hygiene.",
    difficulty: "Beginner",
    durationMin: 50,
  },
  "CLAIMS-003": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "Privacy counsel is waiting on Clause 8 evidence for payroll PII before sign-off.",
    difficulty: "Intermediate",
    durationMin: 60,
  },
  "CLAIMS-004": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "The risk register update is due — show whether privacy controls are planned, not just documented.",
    difficulty: "Intermediate",
    durationMin: 55,
  },
  "CLAIMS-005": {
    skillPathId: "detect-respond",
    skillPathLabel: SKILL_PATHS["detect-respond"],
    stakes: "Suspicious batch activity was flagged overnight — SOC needs your escalation narrative by end of shift.",
    difficulty: "Beginner",
    durationMin: 50,
  },
  "CLAIMS-006": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "No named data owner on payroll profiles — audit committee meets Thursday.",
    difficulty: "Beginner",
    durationMin: 45,
  },
  "CLAIMS-007": {
    skillPathId: "adversarial",
    skillPathLabel: SKILL_PATHS["adversarial"],
    stakes: "You are APCLERK with limited authority — document what a motivated insider can and cannot reach.",
    difficulty: "Intermediate",
    durationMin: 40,
  },
  "COUNTY-001": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "Public records access must be defensible before the county council session.",
    difficulty: "Intermediate",
    durationMin: 55,
  },
  "HOSPITAL-001": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "Clinical operations wants proof that privileged access to patient data is controlled.",
    difficulty: "Intermediate",
    durationMin: 55,
  },
  "HOSPITAL-002": {
    skillPathId: "access-governance",
    skillPathLabel: SKILL_PATHS["access-governance"],
    stakes: "Privacy officer needs IFS and batch export evidence before the HIPAA readiness review.",
    difficulty: "Intermediate",
    durationMin: 60,
  },
};

const DEFAULT_PACKAGING = {
  skillPathId: "access-governance" as SkillPathId,
  skillPathLabel: SKILL_PATHS["access-governance"],
  stakes: "The control owner made a claim — your job is to prove or challenge it with evidence.",
  difficulty: "Beginner" as const,
  durationMin: 45,
};

export function estimateDurationLabel(requiredEvidence: number, optionalEvidence = 0): string {
  const base = 30 + requiredEvidence * 5 + optionalEvidence * 2;
  const rounded = Math.min(90, Math.max(35, Math.round(base / 5) * 5));
  return `~${rounded} min`;
}

export function getMissionPackaging(
  missionId: string,
  evidenceCounts?: { required: number; optional: number },
): MissionPackaging {
  const entry = MISSION_PACKAGING[missionId.toUpperCase()] ?? DEFAULT_PACKAGING;
  const durationLabel =
    evidenceCounts && evidenceCounts.required > 0
      ? estimateDurationLabel(evidenceCounts.required, evidenceCounts.optional)
      : `~${entry.durationMin} min`;

  return {
    skillPathId: entry.skillPathId,
    skillPathLabel: entry.skillPathLabel,
    stakes: entry.stakes,
    difficulty: entry.difficulty,
    durationLabel,
  };
}

export function buildAchievementBadges(options: {
  disciplineBeforeFinding: boolean;
  requiredEvidenceComplete: boolean;
  missionPhase?: string;
  totalScore?: number | null;
  campaignComplete?: boolean;
}): AchievementBadge[] {
  const badges: AchievementBadge[] = [
    {
      id: "discipline",
      label: "Discipline — evidence before findings",
      earned: options.disciplineBeforeFinding,
    },
    {
      id: "evidence-complete",
      label: "Complete — all required evidence",
      earned: options.requiredEvidenceComplete,
    },
    {
      id: "high-score",
      label: "Strong score — 85+",
      earned: (options.totalScore ?? 0) >= 85 && options.missionPhase === "complete",
    },
    {
      id: "campaign-complete",
      label: "Campaign complete",
      earned: options.campaignComplete === true,
    },
  ];
  return badges;
}

export function getSkillPathForLane(lane: string): { id: SkillPathId; label: string; blurb: string } {
  if (lane === "operator") {
    return {
      id: "privileged-ops",
      label: SKILL_PATHS["privileged-ops"],
      blurb: "Operate privileged authority and observe audit side effects.",
    };
  }
  return {
    id: "access-governance",
    label: SKILL_PATHS["access-governance"],
    blurb: "Multi-mission campaign from CLAIMS-001 through county and hospital scenarios.",
  };
}
