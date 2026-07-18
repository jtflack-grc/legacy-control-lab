import { APP_NAME } from "../branding.js";
import {
  loadScreenInventory,
  loadScreenLayoutSpecs,
  type ScreenLayoutSpec,
  type ScreenLayoutTier,
} from "../ibm74/screenLayoutSpec.js";
import { createDisplayUserProfileScreen } from "../screen-runtime/screens/displayUserProfile.js";
import { createDisplayObjectAuthorityScreen } from "../screen-runtime/screens/displayObjectAuthority.js";
import {
  createDisplaySystemValueDetailScreen,
  createWorkWithSystemValuesScreen,
} from "../screen-runtime/screens/displaySystemValue.js";
import { createDisplayJournalScreen } from "../screen-runtime/screens/displayJournal.js";
import { createSignonScreen } from "../screen-runtime/screens/signon.js";
import { createDisplayPrivilegedSessionScreen } from "../screen-runtime/screens/displayPrivilegedSession.js";
import { createWorkUserProfilesScreen } from "../screen-runtime/screens/workUserProfiles.js";
import { createWorkObjectsScreen } from "../screen-runtime/screens/workObjects.js";
import { createAuditMenuScreen } from "../screen-runtime/screens/auditMenu.js";
import { createSecurityMenuScreen } from "../screen-runtime/screens/mainMenu.js";
import { createSecurityStockMenuScreen } from "../screen-runtime/screens/securityStockMenu.js";
import { createCommandPromptScreen } from "../screen-runtime/screens/commandPrompt.js";
import {
  createActivityProfileListScreen,
  createAnalyzeProfileAttributesScreen,
} from "../screen-runtime/screens/analyzeProfileAttributes.js";
import { createDisplayEvidenceDiffScreen } from "../screen-runtime/screens/displayEvidenceDiff.js";
import { createFindingListScreen } from "../screen-runtime/screens/findingEditor.js";
import { createMissionScoreScreen } from "../screen-runtime/screens/missionScreens.js";
import { createQshellScreen } from "../screen-runtime/screens/qshellScreen.js";
import { createDisplayFileDescriptionScreen } from "../screen-runtime/screens/displayFileDescription.js";
import { createDisplayFileFieldDescriptionScreen } from "../screen-runtime/screens/displayFileFieldDescription.js";
import { createDisplayObjectDescriptionScreen } from "../screen-runtime/screens/displayObjectDescription.js";
import { getPhysicalFile } from "../ibmi-runtime/physicalFileService.js";
import { getCatalogObject } from "../ibmi-runtime/objectCatalogService.js";
import {
  createDisplayJobScheduleEntryScreen,
  createWorkJobScheduleEntriesScreen,
  payrollJobScheduleRows,
} from "../screen-runtime/screens/jobScheduleScreens.js";
import {
  createDisplayAuthorizationListScreen,
  createWorkAuthorizationListsScreen,
} from "../screen-runtime/screens/spoolNetworkScreens.js";
import { createWorkObjectOwnerScreen } from "../screen-runtime/screens/workObjectOwner.js";
import { createEditAuthorizationListScreen } from "../screen-runtime/screens/editAuthorizationList.js";
import { createEditObjectAuthorityScreen } from "../screen-runtime/screens/workAuthority.js";
import { createDisplaySecurityAuditScreen } from "../screen-runtime/screens/displaySecurityAudit.js";
import { createDisplayAuthorityScreen } from "../screen-runtime/screens/workAuthority.js";
import {
  createCreateUserProfileScreen,
  createDeleteUserProfileScreen,
} from "../screen-runtime/screens/authorityOpsScreens.js";
import {
  createCfgTcpMenuScreen,
  createChangeNetworkAttributesScreen,
} from "../screen-runtime/screens/networkScreens.js";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { getObjectAuthorityDisplay } from "../ibmi-runtime/authorityService.js";
import { analyzeInactiveProfiles } from "../ibmi-runtime/securityAnalysisService.js";
import { setActivityProfileExempt } from "../ibmi-runtime/userProfileService.js";
import { listAuditJournalEntries } from "../ibmi-runtime/auditJournalService.js";
import { openCommandPrompt } from "../ibmi-runtime/commandPromptService.js";
import { executeCatalogCommand } from "../ibmi-runtime/commandRuntime.js";
import { createSession, hydrateSessionFromProfile } from "../ibmi-runtime/sessionService.js";
import { getMissionAttempt } from "../db/repositories/missionRepository.js";
import { listStateChanges } from "../db/repositories/runtimeRepository.js";
import { startMissionAttempt } from "../missions/missionEngine.js";
import type { ScreenDefinition } from "../screen-runtime/screen.js";
import type { ScreenFidelityResult } from "./screenFidelityAudit.js";

type ScreenLike = Pick<ScreenDefinition, "id" | "fields">;

const SAMPLE_FACTORIES: Record<string, () => ScreenLike> = {
  DSPUSRPRF_BACKUPADM: () => createDisplayUserProfileScreen("CLAIMS400", "BACKUPADM"),
  DSPUSRPRF_OLDVENDOR: () => createDisplayUserProfileScreen("CLAIMS400", "OLDVENDOR"),
  ANZPRFACT_INACT90: () => {
    const analysis = analyzeInactiveProfiles("CLAIMS400", 90);
    return createAnalyzeProfileAttributesScreen(
      "CLAIMS400",
      "Analyze Profile Attributes — Inactive Accounts",
      [
        `INACT threshold . . . . . . . . : 90 days`,
        `Candidates for disable . . . . : ${analysis.candidates.length}`,
      ],
      analysis.findings,
    );
  },
  CHGACTPRFL_BACKUPADM: () => {
    setActivityProfileExempt("CLAIMS400", "BACKUPADM", true);
    return createActivityProfileListScreen("CLAIMS400", "BACKUPADM");
  },
  DSPOBJAUT_PAYMST: () => {
    const authority = getObjectAuthorityDisplay("CLAIMS400", "PAYROLL", "PAYMST");
    if (!authority) throw new Error("PAYROLL/PAYMST authority fixture missing");
    return createDisplayObjectAuthorityScreen("CLAIMS400", "AUDIT", authority);
  },
  EDTOBJAUT_PAYMST: () => {
    const authority = getObjectAuthorityDisplay("CLAIMS400", "PAYROLL", "PAYMST");
    if (!authority) throw new Error("PAYROLL/PAYMST authority fixture missing");
    return createEditObjectAuthorityScreen("CLAIMS400", "QSECOFR", authority);
  },
  WRKUSRPRF: () => createWorkUserProfilesScreen("CLAIMS400", "AUDIT", 0),
  WRKSYSVAL: () => createWorkWithSystemValuesScreen("CLAIMS400", "AUDIT", "WRKSYSVAL", 0),
  WRKOBJ: () => createWorkObjectsScreen("CLAIMS400", "AUDIT", {}, 0),
  DSPSYSVAL_QSECURITY: () =>
    createDisplaySystemValueDetailScreen("CLAIMS400", "AUDIT", "QSECURITY", "40", "Security level"),
  SIGNON: () => createSignonScreen("CLAIMS400", "QINTER", "QINTER"),
  DSPPRVSSN: () => {
    const session = sessionForUser("AUDIT");
    return createDisplayPrivilegedSessionScreen(session);
  },
  DSPJRN_AUDIT: () => {
    const entries = listAuditJournalEntries("CLAIMS400").filter((entry) =>
      ["PW", "AF", "CP"].includes(entry.entryType),
    );
    return createDisplayJournalScreen(
      "CLAIMS400",
      "AUDIT",
      {
        journal: "QAUDJRN",
        library: "QSYS",
        entryTypes: "PW AF CP",
        entries,
        page: 0,
      },
      "DSPJRN",
    );
  },
  CMDPROMPT_CRTLIB: () => {
    const command = getCatalogCommand("CRTLIB");
    if (!command) throw new Error("CRTLIB catalog entry missing");
    return createCommandPromptScreen("CLAIMS400", command, {});
  },
  AUDIT: () => createAuditMenuScreen("CLAIMS400", "AUDIT"),
  SECURITY: () => createSecurityMenuScreen("CLAIMS400", "QSECOFR"),
  SECSTOCK: () => createSecurityStockMenuScreen("CLAIMS400", "QSECOFR"),
  CHGUSRPRF_PROMPT: () => promptScreenFor("CHGUSRPRF USRPRF(OLDVENDOR)"),
  CRTUSRPRF_PROMPT: () => createCreateUserProfileScreen("CLAIMS400"),
  DLTUSRPRF_PROMPT: () => createDeleteUserProfileScreen("CLAIMS400"),
  CHGNETA_PROMPT: () => createChangeNetworkAttributesScreen("CLAIMS400"),
  CFGTCP_MENU: () => createCfgTcpMenuScreen("CLAIMS400"),
  CHGSYSVAL_PROMPT: () => promptScreenFor("CHGSYSVAL SYSVAL(QSECURITY)"),
  GRTOBJAUT_PROMPT: () => promptScreenFor("GRTOBJAUT OBJ(PAYROLL/PAYMST)"),
  RVKOBJAUT_PROMPT: () => promptScreenFor("RVKOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK)"),
  WRKFINDING: () =>
    createFindingListScreen("CLAIMS400", "AUDIT", [
      {
        id: "sample-finding",
        attemptId: "layout-sample",
        missionId: "CLAIMS-001",
        title: "Sample layout finding",
        severity: "MODERATE",
        evidenceRefs: "WRKUSRPRF",
        controlMapping: "LCL-AC-01",
        findingText: "Layout audit sample row.",
        decisionImpact: "CISO must review privileged access within 30 days.",
        recommendation: "Recertify quarterly.",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
  DSPEVDDIFF: () => {
    const session = sessionForUser("QSECOFR");
    startMissionAttempt(session);
    executeCatalogCommand(session, "CHGUSRPRF", "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)");
    const attemptId = session.missionAttemptId;
    if (!attemptId) throw new Error("Mission attempt missing for DSPEVDDIFF sample");
    const attempt = getMissionAttempt(attemptId);
    const changes = listStateChanges(attemptId, "user_profile");
    return createDisplayEvidenceDiffScreen(
      session.systemName,
      session.userName!,
      attempt?.missionId ?? "CLAIMS-001",
      "*USRPRF",
      changes,
    );
  },
  SUBMITMSN_SCORE: () =>
    createMissionScoreScreen("CLAIMS400", [
      "Mission score: 82",
      "Evidence coverage: 78%",
      "Report exported: examples/reports/claims-001-auditor-report.md",
    ]),
  QSH: () => createQshellScreen(sessionForUser("AUDIT")),
  DSPFD_PAYMST: () => {
    const file = getPhysicalFile("CLAIMS400", "PAYROLL", "PAYMST");
    if (!file) throw new Error("PAYROLL/PAYMST fixture missing");
    return createDisplayFileDescriptionScreen("CLAIMS400", "AUDIT", file);
  },
  WRKJOBSCDE_PAYROLL: () =>
    createWorkJobScheduleEntriesScreen("CLAIMS400", payrollJobScheduleRows()),
  WRKAUTL: () => createWorkAuthorizationListsScreen("CLAIMS400"),
  WRKOBJOWN: () =>
    createWorkObjectOwnerScreen("CLAIMS400", { userProfile: "PAYADMIN", objType: "*ALL" }, 0),
  EDTAUTL: () =>
    createEditAuthorizationListScreen("CLAIMS400", "PAYROLL", [
      { user: "PAYADMIN", authority: "*ALL" },
      { user: "APCLERK", authority: "*USE" },
      { user: "*PUBLIC", authority: "*EXCLUDE" },
    ]),
  DSPAUTL_PAYROLL: () => createDisplayAuthorizationListScreen("CLAIMS400", "PAYROLL"),
  DSPSECAUD_AF: () => {
    const entries = listAuditJournalEntries("CLAIMS400", { entryType: "AF" });
    return createDisplaySecurityAuditScreen("CLAIMS400", entries, 0);
  },
  DSPAUT_BACKUPADM: () => createDisplayAuthorityScreen("CLAIMS400", "BACKUPADM"),
  DSPOBJD_PAYMST: () => {
    const object = getCatalogObject("CLAIMS400", "PAYROLL", "PAYMST");
    if (!object) throw new Error("PAYROLL/PAYMST fixture missing");
    return createDisplayObjectDescriptionScreen("CLAIMS400", "AUDIT", object);
  },
  DSPFFD_PAYMST: () => {
    const file = getPhysicalFile("CLAIMS400", "PAYROLL", "PAYMST");
    if (!file) throw new Error("PAYROLL/PAYMST fixture missing");
    return createDisplayFileFieldDescriptionScreen("CLAIMS400", "AUDIT", file);
  },
};

function promptScreenFor(partialCommand: string, user = "QSECOFR"): ScreenLike {
  const session = sessionForUser(user);
  const result = openCommandPrompt(session, partialCommand);
  if (result.kind !== "screen") {
    throw new Error(`${partialCommand} prompt did not return a screen (${result.kind})`);
  }
  return result.screen;
}

function sessionForUser(user: string) {
  const session = createSession("CLAIMS400");
  session.signedOn = true;
  session.userName = user;
  hydrateSessionFromProfile(session, user, "CLAIMS400");
  session.currentMenu = user === "QSECOFR" ? "SECURITY" : "AUDIT";
  return session;
}

function normalizeScreenForSpec(spec: ScreenLayoutSpec, screen: ScreenLike): ScreenLike {
  if (screen.id === spec.screenId) return screen;
  if (screen.id === "CMDPROMPT" || screen.id === "FINDING") {
    return { ...screen, id: spec.screenId };
  }
  return screen;
}

export function renderScreenForLayoutSpec(spec: ScreenLayoutSpec): ScreenLike {
  let screen: ScreenLike;
  if (spec.render.type === "sample") {
    const factory = SAMPLE_FACTORIES[spec.render.sample];
    if (!factory) {
      throw new Error(`Unknown layout sample factory: ${spec.render.sample}`);
    }
    screen = factory();
  } else {
    const user = spec.render.user ?? "AUDIT";
    const session = sessionForUser(user);
    const result = executeCatalogCommand(session, spec.render.command.split(/\s+/)[0]!, spec.render.command);
    if (result.kind !== "screen") {
      throw new Error(`${spec.render.command} did not return a screen (${result.kind})`);
    }
    screen = result.screen;
  }
  return normalizeScreenForSpec(spec, screen);
}

export function auditScreenLayout(
  spec: ScreenLayoutSpec,
  screen: ScreenLike,
): ScreenFidelityResult {
  const id = spec.screenId.toLowerCase();
  const title = `${spec.screenId} IBM i layout`;
  try {
    if (screen.id !== spec.screenId) {
      throw new Error(`Screen id ${screen.id} !== spec ${spec.screenId}`);
    }

    const text = screen.fields.map((field) => field.value ?? "").join("\n");
    const fieldById = new Map(screen.fields.map((field) => [field.id, field]));

    for (const banned of [...(spec.bannedSubstrings ?? []), ...(spec.forbiddenText ?? [])]) {
      if (text.includes(banned)) {
        throw new Error(`Forbidden text on screen: ${banned}`);
      }
    }

    for (const required of spec.requiredFields ?? []) {
      if (!fieldById.has(required)) {
        throw new Error(`Missing required field: ${required}`);
      }
    }

    for (const snippet of spec.requiredText ?? []) {
      if (!text.includes(snippet)) {
        throw new Error(`Missing required text: ${snippet}`);
      }
    }

    for (const rule of spec.fieldRules ?? []) {
      const fields = rule.id
        ? [fieldById.get(rule.id)].filter((field): field is NonNullable<typeof field> => !!field)
        : screen.fields;
      if (rule.id && fields.length === 0) {
        throw new Error(`Field rule target missing: ${rule.id}`);
      }
      for (const field of fields) {
        if (rule.row !== undefined && field.row !== rule.row) {
          throw new Error(`Field ${field.id} row ${field.row} !== ${rule.row}`);
        }
        if (rule.col !== undefined && field.col !== rule.col) {
          throw new Error(`Field ${field.id} col ${field.col} !== ${rule.col}`);
        }
        const value = field.value ?? "";
        if (rule.valueContains && !value.includes(rule.valueContains)) {
          throw new Error(`Field ${field.id} missing "${rule.valueContains}"`);
        }
        if (rule.valueMatches && !new RegExp(rule.valueMatches).test(value)) {
          throw new Error(`Field ${field.id} does not match /${rule.valueMatches}/`);
        }
      }
    }

    if (spec.subfile) {
      const pattern = new RegExp(spec.subfile.optionIdPattern ?? "^(OPT|SOPT|OOPT|JOPT)\\d+$");
      const optionFields = screen.fields.filter((field) => pattern.test(field.id));
      if (optionFields.length > spec.subfile.maxVisibleRows) {
        throw new Error(
          `Subfile shows ${optionFields.length} option rows; max ${spec.subfile.maxVisibleRows}`,
        );
      }
      for (const field of optionFields) {
        if (field.row < spec.subfile.firstDataRow || field.row > spec.subfile.lastDataRow) {
          throw new Error(`Option field ${field.id} on row ${field.row} outside subfile data area`);
        }
      }
      const cmd = fieldById.get("SUBFILE_CMD");
      if (cmd && cmd.row !== spec.subfile.commandLineRow) {
        throw new Error(`Command line on row ${cmd.row}; expected ${spec.subfile.commandLineRow}`);
      }
    }

    return { id, title, pass: true };
  } catch (err) {
    return {
      id,
      title,
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function runIbmScreenLayoutAudit(tiers: ScreenLayoutTier[] = ["A"]): ScreenFidelityResult[] {
  const allowed = new Set(tiers);
  const results: ScreenFidelityResult[] = [];

  for (const spec of loadScreenLayoutSpecs()) {
    if (!allowed.has(spec.tier)) continue;
    if (spec.enforceInCi === false) continue;
    try {
      const screen = renderScreenForLayoutSpec(spec);
      results.push(auditScreenLayout(spec, screen));
    } catch (err) {
      results.push({
        id: spec.screenId.toLowerCase(),
        title: `${spec.screenId} IBM i layout`,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export function formatLayoutInventoryReport(): string {
  const inventory = loadScreenInventory();
  const specs = new Set(loadScreenLayoutSpecs().map((spec) => spec.screenId));
  const lines = [
    `${APP_NAME} — IBM i screen inventory`,
    inventory.updatedAt,
    "",
    "Tier A/B screens without a .layout.json spec still need a golden reference capture from a real partition.",
    "",
    "ID            Tier  Status              Spec   Command / path",
    "-".repeat(78),
  ];

  for (const entry of inventory.entries) {
    const hasSpec = specs.has(entry.screenId) || entry.specFile ? "yes" : "no ";
    lines.push(
      `${entry.screenId.padEnd(13)} ${entry.tier}     ${entry.verificationStatus.padEnd(18)} ${hasSpec}    ${entry.command}${entry.menuPath ? ` (${entry.menuPath})` : ""}`,
    );
  }

  const needsGolden = inventory.entries.filter((entry) => entry.verificationStatus === "needs-golden");
  lines.push("", `Needs golden reference: ${needsGolden.length} of ${inventory.entries.length}`);
  return lines.join("\n");
}

export function formatIbmScreenLayoutReport(results: ScreenFidelityResult[]): string {
  const pass = results.filter((result) => result.pass).length;
  const fail = results.length - pass;
  const lines = [
    `${APP_NAME} — IBM i Screen Layout Audit`,
    new Date().toISOString(),
    `PASS ${pass} · FAIL ${fail} · TOTAL ${results.length}`,
    "",
  ];
  for (const result of results) {
    lines.push(`${result.pass ? "PASS" : "FAIL"}  [${result.id}] ${result.title}`);
    if (result.detail) lines.push(`       ${result.detail}`);
  }
  lines.push("", formatLayoutInventoryReport());
  return lines.join("\n");
}
