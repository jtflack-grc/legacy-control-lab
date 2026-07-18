import { listUserProfiles as listUserProfileRows } from "../db/repositories/userProfileRepository.js";

export type SecurityFinding = {
  userName: string;
  finding: string;
};

const BUILTIN_INACT_EXEMPT = new Set(["QSECOFR", "QSYSOPR", "QSYS"]);

function parseLastSignon(lastSignon: string | null): Date | null {
  if (!lastSignon) return null;
  const match = lastSignon.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  year += year >= 70 ? 1900 : 2000;
  return new Date(year, month - 1, day);
}

export function daysSinceSignon(lastSignon: string | null, reference = new Date()): number | null {
  const parsed = parseLastSignon(lastSignon);
  if (!parsed) return null;
  const diffMs = reference.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function analyzeDefaultPasswords(systemName = "CLAIMS400"): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const profile of listUserProfileRows(systemName)) {
    if (profile.status === "*DISABLED") continue;
    if (!profile.password) {
      findings.push({ userName: profile.userName, finding: "Password not set (*DEFAULT risk)" });
      continue;
    }
    if (profile.password === profile.userName) {
      findings.push({ userName: profile.userName, finding: "Password matches user profile name" });
    }
    if (profile.password === "TRAIN" || profile.password === "TRAINING" || profile.password === "PASSWORD") {
      findings.push({ userName: profile.userName, finding: "Known weak training password in use" });
    }
  }
  return findings;
}

export function analyzeProfileAttributes(systemName = "CLAIMS400"): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const profile of listUserProfileRows(systemName)) {
    if (profile.status === "*DISABLED") {
      findings.push({ userName: profile.userName, finding: "Profile is disabled" });
    }
    if (profile.userName === "BACKUPADM" && profile.specialAuthorities?.includes("*ALLOBJ")) {
      findings.push({
        userName: profile.userName,
        finding: "Stale privileged profile — last sign-on 11/03/24 with *ALLOBJ *SAVSYS",
      });
    }
    if (profile.userName === "OLDVENDOR" && profile.status === "*ENABLED") {
      findings.push({
        userName: profile.userName,
        finding: "Former vendor account still enabled with *JOBCTL",
      });
    }
    if (profile.userClass === "*SECOFR" && profile.specialAuthorities === "*NONE") {
      findings.push({ userName: profile.userName, finding: "*SECOFR class without special authorities" });
    }
    if (profile.specialAuthorities?.includes("*ALLOBJ")) {
      findings.push({ userName: profile.userName, finding: "Profile has *ALLOBJ special authority" });
    }
    if (profile.groupProfile && profile.groupProfile !== "*NONE" && profile.status === "*ENABLED") {
      findings.push({
        userName: profile.userName,
        finding: `Group profile ${profile.groupProfile} assigned`,
      });
    }
  }
  return findings;
}

export function analyzeInactiveProfiles(
  systemName = "CLAIMS400",
  inactDays = 90,
): { findings: SecurityFinding[]; candidates: string[]; exempt: string[] } {
  const findings: SecurityFinding[] = [];
  const candidates: string[] = [];
  const exempt: string[] = [];
  const reference = new Date(2026, 5, 9);

  for (const profile of listUserProfileRows(systemName)) {
    if (profile.status === "*DISABLED") continue;
    if (BUILTIN_INACT_EXEMPT.has(profile.userName) || profile.activityProfileExempt) {
      exempt.push(profile.userName);
      continue;
    }

    const idleDays = daysSinceSignon(profile.lastSignon, reference);
    if (idleDays === null) {
      findings.push({
        userName: profile.userName,
        finding: "No sign-on recorded — review before automated disable",
      });
      candidates.push(profile.userName);
      continue;
    }

    if (idleDays >= inactDays) {
      const last = profile.lastSignon ?? "*NONE";
      findings.push({
        userName: profile.userName,
        finding: `Inactive ${idleDays} days (last sign-on ${last}) — candidate for disable`,
      });
      candidates.push(profile.userName);
    }
  }

  return { findings, candidates, exempt };
}
