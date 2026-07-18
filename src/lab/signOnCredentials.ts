import { getUserProfile as getUserProfileRow } from "../db/repositories/userProfileRepository.js";
import { DEFAULT_TIPS, OPERATOR_TIPS, type CoachTips } from "./coachContent.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";

export const DEFAULT_TRAINING_PASSWORD = "TRAIN";

/** Default sign-on when a training profile has no password row yet. */
const TRAINING_PROFILE_DEFAULT_PASSWORDS: Partial<Record<string, string>> = {
  IONGRC: "IONGRC",
};

export const TRAINING_PROFILE_USERS = ["AUDIT", "QSECOFR", "APCLERK", "DEMO", "IONGRC"] as const;
export type TrainingProfileUser = (typeof TRAINING_PROFILE_USERS)[number];

export type SignOnCredential = {
  user: string;
  password: string;
};

export type LaneSignOnCredentials = {
  auditor: SignOnCredential;
  operator: SignOnCredential;
};

export type TrainingProfileCredentials = LaneSignOnCredentials & {
  apclerk: SignOnCredential;
  demo: SignOnCredential;
  iongrc: SignOnCredential;
};

export function getProfilePassword(systemName: string, userName: string): string {
  const normalized = userName.trim().toUpperCase();
  if (normalized === "IONGRC") {
    return TRAINING_PROFILE_DEFAULT_PASSWORDS.IONGRC ?? "IONGRC";
  }
  const profile = getUserProfileRow(systemName, normalized);
  const password = profile?.password?.trim();
  if (password) return password.toUpperCase();
  const trainingDefault = TRAINING_PROFILE_DEFAULT_PASSWORDS[normalized];
  if (trainingDefault) return trainingDefault;
  return DEFAULT_TRAINING_PASSWORD;
}

export function formatSignOnPair(userName: string, password: string): string {
  return `${userName.toUpperCase()} / ${password.toUpperCase()}`;
}

export function signOnCommandLabel(userName: string, password: string): string {
  return `User: ${userName.toUpperCase().padEnd(5)} Password: ${password.toUpperCase()}`;
}

export function isDefaultTrainingPassword(password: string): boolean {
  return password.trim().toUpperCase() === DEFAULT_TRAINING_PASSWORD;
}

export function getTrainingProfileCredentials(systemName: string): TrainingProfileCredentials {
  return {
    auditor: {
      user: "AUDIT",
      password: getProfilePassword(systemName, "AUDIT"),
    },
    operator: {
      user: "QSECOFR",
      password: getProfilePassword(systemName, "QSECOFR"),
    },
    apclerk: {
      user: "APCLERK",
      password: getProfilePassword(systemName, "APCLERK"),
    },
    demo: {
      user: "DEMO",
      password: getProfilePassword(systemName, "DEMO"),
    },
    iongrc: {
      user: "IONGRC",
      password: getProfilePassword(systemName, "IONGRC"),
    },
  };
}

export function getLaneSignOnCredentials(systemName: string): LaneSignOnCredentials {
  const creds = getTrainingProfileCredentials(systemName);
  return { auditor: creds.auditor, operator: creds.operator };
}

/** Lane credentials for /api/lab/config — omits passwords in production (UI uses static hints). */
export function getPublicLaneCredentialsForApi(systemName: string): LaneSignOnCredentials {
  const creds = getLaneSignOnCredentials(systemName);
  if (process.env.NODE_ENV !== "production") {
    return creds;
  }
  return {
    auditor: { user: creds.auditor.user, password: "" },
    operator: { user: creds.operator.user, password: "" },
  };
}

export function credentialForUser(
  credentials: TrainingProfileCredentials,
  userName: string,
): SignOnCredential | undefined {
  const user = userName.trim().toUpperCase();
  if (user === credentials.auditor.user) return credentials.auditor;
  if (user === credentials.operator.user) return credentials.operator;
  if (user === credentials.apclerk.user) return credentials.apclerk;
  if (user === credentials.demo.user) return credentials.demo;
  if (user === credentials.iongrc.user) return credentials.iongrc;
  return undefined;
}

export function hydrateSignOnCopy(text: string, systemName: string): string {
  const creds = getTrainingProfileCredentials(systemName);
  let result = text;
  for (const { user, password } of [
    creds.auditor,
    creds.operator,
    creds.apclerk,
    creds.demo,
    creds.iongrc,
  ]) {
    const pair = formatSignOnPair(user, password);
    result = result.replace(new RegExp(`${user}\\s*/\\s*[A-Z0-9*]+`, "gi"), pair);
    result = result.replace(
      new RegExp(`User:\\s*${user}\\s+Password:\\s*\\S+`, "gi"),
      signOnCommandLabel(user, password),
    );
  }
  return result;
}

/**
 * Coach tip credentials. Unauthenticated mission GETs always use public training
 * defaults (TRAIN / IONGRC) — never a post-CHGPWD secret from the DB.
 */
export function buildCoachTipsForLane(
  systemName: string,
  lane: SessionLane,
  options: { includeLivePasswords?: boolean } = {},
): CoachTips {
  const base = lane === "operator" ? OPERATOR_TIPS : DEFAULT_TIPS;
  const creds = getTrainingProfileCredentials(systemName);
  const signOn =
    lane === "operator"
      ? creds.operator
      : lane === "demo"
        ? creds.demo
        : lane === "iongrc"
          ? creds.iongrc
          : creds.auditor;
  const password = options.includeLivePasswords
    ? signOn.password
    : signOn.user === "IONGRC"
      ? "IONGRC"
      : DEFAULT_TRAINING_PASSWORD;
  return {
    ...base,
    signOn: { user: signOn.user, password },
  };
}

export function disconnectedSignOnHint(systemName: string): string {
  const creds = getTrainingProfileCredentials(systemName);
  return (
    `Sign on to ${systemName} as ${formatSignOnPair(creds.demo.user, creds.demo.password)} (showroom demo), ` +
    `${formatSignOnPair(creds.iongrc.user, creds.iongrc.password)} (i on GRC articles), ` +
    `${formatSignOnPair(creds.auditor.user, creds.auditor.password)} (governance), ` +
    `${formatSignOnPair(creds.apclerk.user, creds.apclerk.password)} (Red Team), ` +
    `or ${formatSignOnPair(creds.operator.user, creds.operator.password)} (operator lane).`
  );
}

export function operatorSignOnIntro(systemName: string): string {
  const creds = getTrainingProfileCredentials(systemName).operator;
  const passwordNote = isDefaultTrainingPassword(creds.password)
    ? "Default password is TRAIN until you change it with CHGPWD."
    : "You changed this profile with CHGPWD — sign on with your current password (not shown in this panel).";
  const pair = isDefaultTrainingPassword(creds.password)
    ? formatSignOnPair(creds.user, creds.password)
    : `${creds.user} / (your CHGPWD password)`;
  return (
    `You chose the security officer lane. Sign on as ${pair}, ` +
    `work from SECURITY, and use this panel to understand each display the way you would on a production partition. ` +
    passwordNote
  );
}

export function helpSignOnLines(systemName: string): string[] {
  const creds = getTrainingProfileCredentials(systemName);
  return [
    `Sign-on: ${formatSignOnPair(creds.demo.user, creds.demo.password)} (showroom) · ${formatSignOnPair(creds.iongrc.user, creds.iongrc.password)} (i on GRC)`,
    `         ${formatSignOnPair(creds.auditor.user, creds.auditor.password)} (governance) · ${formatSignOnPair(creds.apclerk.user, creds.apclerk.password)} (red team) · ${formatSignOnPair(creds.operator.user, creds.operator.password)} (operator)`,
  ];
}
