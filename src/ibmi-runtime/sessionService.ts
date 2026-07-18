import { ensureIongrcTrainingProfile } from "../db/trainingProfileEnsure.js";
import { getDatabase } from "../db/sqlite.js";
import { getUserProfile as getUserProfileRow } from "../db/repositories/userProfileRepository.js";
import type { SessionLane } from "./sessionLane.js";
import {
  defaultGuidanceForLane,
  defaultPersonaForLane,
  homeMenuForLane,
  resolveSessionLane,
} from "./sessionLane.js";

export type IbmiSession = {
  id: string;
  systemName: string;
  subsystem: string;
  displayName: string;
  deviceType: string;
  signedOn: boolean;
  userName?: string;
  currentLibrary: string;
  initialMenu: string;
  currentMenu: string;
  libraryList: {
    system: string[];
    product: string[];
    current?: string;
    user: string[];
  };
  commandHistory: string[];
  /** F9 retrieve walks this index into commandHistory (0 = most recent). */
  commandRetrieveIndex?: number;
  job: {
    jobNumber: string;
    user: string;
    jobName: string;
    type: "INTERACTIVE" | "BATCH";
    subsystem: string;
    jobDescription: string;
    jobQueue: string;
    outputQueue: string;
    status: string;
    enteredAt: string;
    startedAt: string;
  };
  missionAttemptId?: string;
  focusFindingComposer?: boolean;
  scenarioId?: string;
  campaignId?: string;
  personaId?: string;
  guidanceMode?: string;
  variantId?: string;
  journalContext?: {
    entryTypes: string;
    entries: import("./auditJournalService.js").AuditJournalEntry[];
  };
  fileContext?: {
    library: string;
    name: string;
  };
  ifsContext?: {
    directory: string;
  };
  subfilePage?: Partial<Record<string, number>>;
  runSqlContext?: {
    sql: string;
    page: number;
  };
  qshellContext?: import("./pase/qshellRuntime.js").QshellSessionState;
  promptContext?: {
    commandName: string;
    values: Record<string, string>;
  };
  jobFilterContext?: {
    subsystem?: string;
    userName?: string;
  };
  workJobContext?: import("./jobService.js").JobSummary;
  jobLogShowAll?: boolean;
  /** When set, WRKSYSSTS/WRKDSKSTS elapsed time counts from this timestamp (F10 restart). */
  monitorStatsResetAt?: number;
  libraryContext?: {
    name: string;
    type: string;
    text: string;
    objectCount: number;
  };
  lastMessage?: string;
  lane?: SessionLane;
  /** Active i on GRC article pack when signed on as IONGRC */
  iongrcPackId?: string;
  iongrcStepIndex?: number;
  messageQueues?: Record<string, import("./messageService.js").MessageQueueEntry[]>;
  messageOverrides?: Record<string, Record<string, import("./messageService.js").MessageQueueOverride>>;
  messageContext?: {
    queueName: string;
    selectedMessageId?: string;
    astLevel?: "basic" | "intermed";
    infoPage?: number;
  };
  ptfContext?: {
    groupId: string;
  };
  catalogWorkContext?: {
    screenId: string;
    rows: Array<{ line: string; drillDown?: { command: string; input: string } }>;
  };
  objOwnContext?: {
    userProfile: string;
    objType: string;
  };
  autlEditContext?: {
    listName: string;
    members: Array<{ user: string; authority: string }>;
  };
  pdmContext?: {
    library: string;
    sourceFile?: string;
    member?: string;
    memberPage?: number;
    programRef?: string;
  };
  /** Zero-based page index for paginated CMD* group menus. */
  menuPage?: Partial<Record<string, number>>;
};

const DEFAULT_SYSTEM = "CLAIMS400";

export function createSession(systemName: string): IbmiSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    systemName,
    subsystem: "QINTER",
    displayName: "QPADEV0001",
    deviceType: "IBM-3477-FC",
    signedOn: false,
    currentLibrary: "*CRTDFT",
    initialMenu: "AUDIT",
    currentMenu: "SIGNON",
    libraryList: {
      system: ["QSYS", "QSYS2", "QHLPSYS", "QUSRSYS"],
      product: ["QGPL"],
      user: ["QTEMP"],
    },
    commandHistory: [],
    scenarioId: systemName.toLowerCase(),
    personaId: "auditor",
    guidanceMode: "coach",
    job: {
      jobNumber: "123456",
      user: "",
      jobName: "QPADEV0001",
      type: "INTERACTIVE",
      subsystem: "QINTER",
      jobDescription: "QDFTJOBD",
      jobQueue: "QINTER",
      outputQueue: "QPRINT",
      status: "ACTIVE",
      enteredAt: now,
      startedAt: now,
    },
  };
}

export type AuthResult =
  | { ok: true; userName: string }
  | { ok: false; message: string };

export function authenticateUser(
  user: string,
  password: string,
  systemName = DEFAULT_SYSTEM,
): AuthResult {
  const normalizedUser = user.trim().toUpperCase();
  const normalizedPassword = password.trim().toUpperCase();
  const resolvedUser = normalizedUser === "AUDITOR01" ? "AUDIT" : normalizedUser;

  if (resolvedUser === "IONGRC" && normalizedPassword === "IONGRC") {
    let profile = getUserProfileRow(systemName, resolvedUser);
    if (!profile) {
      ensureIongrcTrainingProfile(getDatabase());
      profile = getUserProfileRow(systemName, resolvedUser);
    }
    if (!profile || profile.status === "*DISABLED") {
      return { ok: false, message: "Invalid user ID or password." };
    }
    return { ok: true, userName: resolvedUser };
  }

  const profile = getUserProfileRow(systemName, resolvedUser);

  if (!profile) {
    return { ok: false, message: "Invalid user ID or password." };
  }

  if (profile.status === "*DISABLED") {
    return { ok: false, message: "User profile is disabled." };
  }

  if (
    profile.password === "TRAIN" &&
    (normalizedPassword === "TRAIN" || normalizedPassword === "TRAINING")
  ) {
    return { ok: true, userName: resolvedUser };
  }

  if (profile.password && profile.password !== normalizedPassword) {
    return { ok: false, message: "Invalid user ID or password." };
  }

  if (
    !profile.password &&
    resolvedUser === "AUDIT" &&
    normalizedPassword !== "TRAIN" &&
    normalizedPassword !== "TRAINING"
  ) {
    return { ok: false, message: "Invalid user ID or password." };
  }

  if (!profile.password && (profile.userClass === "*SECOFR" || resolvedUser === "QSECOFR")) {
    return { ok: false, message: "Invalid user ID or password." };
  }

  return { ok: true, userName: resolvedUser };
}

export function hydrateSessionFromProfile(
  session: IbmiSession,
  userName: string,
  systemName = DEFAULT_SYSTEM,
): void {
  const profile = getUserProfileRow(systemName, userName);
  const lane = resolveSessionLane(
    userName,
    profile?.userClass,
    profile?.initialMenu ?? session.initialMenu,
  );
  session.lane = lane;
  session.initialMenu = profile?.initialMenu ?? homeMenuForLane(lane);
  session.currentMenu = session.initialMenu;
  session.personaId = defaultPersonaForLane(lane);
  session.guidanceMode = defaultGuidanceForLane(lane);
  const currentLibrary = (profile as { currentLibrary?: string } | undefined)?.currentLibrary;
  if (currentLibrary) {
    session.currentLibrary = currentLibrary;
  }
}

export function signOffSession(session: IbmiSession): void {
  session.signedOn = false;
  session.userName = undefined;
  session.currentMenu = "SIGNON";
  session.job.user = "";
  session.missionAttemptId = undefined;
}
