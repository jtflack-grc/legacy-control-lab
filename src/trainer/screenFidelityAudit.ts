import { readFileSync, readdirSync } from "node:fs";
import { APP_NAME } from "../branding.js";
import { join } from "node:path";
import { createDisplayUserProfileScreen } from "../screen-runtime/screens/displayUserProfile.js";
import { createDisplayObjectAuthorityScreen } from "../screen-runtime/screens/displayObjectAuthority.js";
import { getObjectAuthorityDisplay } from "../ibmi-runtime/authorityService.js";
import { loadScreenSpec, type Ibm74ScreenSpec } from "../ibm74/referenceScreenService.js";
import { getCommandReference } from "../ibm74/referenceService.js";
import { executeCatalogCommand } from "../ibmi-runtime/commandRuntime.js";
import { createSession, hydrateSessionFromProfile, type IbmiSession } from "../ibmi-runtime/sessionService.js";
import { getCommand } from "../ibmi-runtime/commandCatalog.js";
import { commandSamples } from "./commandSamples.js";
import { sessionHasSpecialAuthority } from "../ibmi-runtime/authorityCheck.js";
import { parseCommand } from "../ibmi-runtime/commandParser.js";
import {
  catalogVerbFamily,
  createCatalogCommandScreen,
} from "../screen-runtime/screens/catalogCommandScreens.js";
import { createDepthDisplayScreen } from "../ibmi-runtime/catalogDisplayEngine.js";
import { handlerNameForCatalogCommand } from "../ibmi-runtime/catalogCommandHandlers.js";

export type ScreenFidelityResult = {
  id: string;
  title: string;
  pass: boolean;
  detail?: string;
};

type ScreenSpec = {
  screenId: string;
  requiredFields: string[];
  bannedSubstrings: string[];
};

const CATALOG_HANDLERS = new Set([
  "catalogWorkWith",
  "catalogDisplay",
  "catalogChange",
  "catalogCreate",
  "catalogDelete",
  "catalogAction",
  "catalogControl",
  "catalogBackup",
  "catalogNetwork",
  "catalogCommand",
]);

function loadLegacySpecs(): ScreenSpec[] {
  const dir = join(process.cwd(), "data", "screen-specs");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".spec.json"))
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")) as ScreenSpec);
}

const LEGACY_STRICT_SCREENS = new Set(["DSPUSRPRF", "DSPOBJAUT"]);

export function auditScreen(
  id: string,
  title: string,
  screen: { id: string; fields: Array<{ id: string; value?: string }> },
  spec: ScreenSpec | Ibm74ScreenSpec,
): ScreenFidelityResult {
  try {
    const ibmSpec = spec as Ibm74ScreenSpec;
    const deepAudit = ibmSpec.auditMode === "deep";

    if (screen.id !== spec.screenId) {
      throw new Error(`Screen id ${screen.id} !== spec ${spec.screenId}`);
    }

    const text = screen.fields.map((f) => f.value ?? "").join("\n");
    for (const banned of spec.bannedSubstrings) {
      if (text.includes(banned)) {
        throw new Error(`Banned substring on screen: ${banned}`);
      }
    }

    if (deepAudit) {
      if (screen.fields.length < 3) {
        throw new Error(`Too few fields (${screen.fields.length})`);
      }
      if (text.includes("GENWRK") || text.includes("GENDSP")) {
        throw new Error("Stub screen content detected");
      }
      return { id, title, pass: true };
    }

    const fieldIds = new Set(screen.fields.map((f) => f.id));
    for (const required of spec.requiredFields) {
      if (!fieldIds.has(required)) {
        throw new Error(`Missing field ${required}`);
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

export function sampleCommandInput(commandName: string): string {
  if (commandSamples[commandName]) return commandSamples[commandName];
  const ref = getCommandReference(commandName);
  if (ref?.examples?.[0]) return ref.examples[0];
  const definition = getCommand(commandName);
  const required = definition?.parameters?.find((param) => param.required);
  if (required?.name === "JOBD") return `${commandName} JOBD(QBATCH/QDFTJOBD)`;
  if (required?.name === "USRPRF") return `${commandName} USRPRF(BACKUPADM)`;
  if (required?.name === "SYSVAL") return `${commandName} SYSVAL(QSECURITY)`;
  if (required?.name === "OBJ") return `${commandName} OBJ(PAYROLL/PAYMST)`;
  if (required?.name === "FILE") return `${commandName} FILE(PAYROLL/PAYMST)`;
  if (required?.name === "LIB") return `${commandName} LIB(CLAIMS400)`;
  if (required?.name === "JOB") return `${commandName} JOB(230145/BACKUPADM/BACKUPJOB)`;
  if (required?.name === "MSGQ") return `${commandName} MSGQ(QSYS/QSYSOPR)`;
  if (required?.name === "MSGID") return `${commandName} MSGID(CPF2204)`;
  if (required?.name === "JRN") return `${commandName} JRN(QSYS/QAUDJRN)`;
  if (required?.name === "SERVER") return `${commandName} SERVER(QIBM_QTM)`;
  if (required?.name === "SBS") return `${commandName} SBS(QBATCH)`;
  if (required?.name === "CMD") return `${commandName} CMD(CALL PGM(PAYROLL/CLOSE))`;
  if (required?.name === "MSG") return `${commandName} MSG('Lab message')`;
  if (required?.name === "TYPE") return `${commandName} TYPE(*CAMPAIGN)`;
  if (required?.name === "CONFIRM") return `${commandName} CONFIRM(*YES)`;
  if (required?.name === "CURLIB") return `${commandName} CURLIB(CLAIMS400)`;
  if (required?.name === "MBR") return `${commandName} FILE(CLAIMS400/QCLSRC) MBR(NIGHTRUN)`;
  if (required) return `${commandName} ${required.name}(SAMPLE)`;
  return commandName;
}

function auditSessionFor(commandName: string): IbmiSession {
  const definition = getCommand(commandName);
  const needsSecadm = (definition?.requiresAuthority ?? []).some(
    (auth) => auth === "*SECADM" || auth === "*ALLOBJ",
  );
  const needsObjMgmt = (definition?.requiresAuthority ?? []).includes("*OBJMGT");
  const privileged =
    commandName.startsWith("CHG") ||
    commandName.startsWith("CRT") ||
    commandName.startsWith("DLT") ||
    needsSecadm ||
    needsObjMgmt;
  const user = privileged ? "QSECOFR" : "AUDIT";
  const session = createSession("CLAIMS400");
  session.signedOn = true;
  session.userName = user;
  hydrateSessionFromProfile(session, user, "CLAIMS400");
  session.currentMenu = sessionHasSpecialAuthority(session, ["*SECADM"]) ? "SECURITY" : "AUDIT";
  return session;
}

function renderCatalogFactoryScreen(
  commandName: string,
): { id: string; fields: Array<{ id: string; value?: string }> } | null {
  const definition = getCommand(commandName);
  if (!definition || definition.status !== "implemented") return null;

  const handler = definition.handler ?? handlerNameForCatalogCommand(commandName);
  if (!CATALOG_HANDLERS.has(handler)) return null;

  const session = auditSessionFor(commandName);
  const input = sampleCommandInput(commandName);
  const parsed = parseCommand(input) ?? undefined;
  const catalogDefinition = {
    ...definition,
    category: definition.category,
    displayName: definition.displayName,
    status: definition.status,
  };
  const family = catalogVerbFamily(commandName);
  const screen =
    family === "display"
      ? createDepthDisplayScreen(catalogDefinition, session, parsed)
      : createCatalogCommandScreen(catalogDefinition, session, parsed);
  return screen;
}

function isCatalogBacked(commandName: string): boolean {
  const definition = getCommand(commandName);
  if (!definition) return false;
  const handler = definition.handler ?? handlerNameForCatalogCommand(commandName);
  return CATALOG_HANDLERS.has(handler);
}

function renderScreenForAudit(
  commandName: string,
): { id: string; fields: Array<{ id: string; value?: string }> } | null {
  if (isCatalogBacked(commandName)) {
    return renderCatalogFactoryScreen(commandName);
  }

  const session = auditSessionFor(commandName);
  const input = sampleCommandInput(commandName);
  const screenInput = commandName === "CHGOBJAUD" ? commandName : input;
  const parsed = parseCommand(screenInput) ?? undefined;
  const result = executeCatalogCommand(session, commandName, screenInput, parsed);
  if (result.kind === "screen") return result.screen;
  return null;
}

function loadAllIbm74ScreenSpecs(): Array<{ commandName: string; spec: Ibm74ScreenSpec }> {
  const dir = join(process.cwd(), "data", "ibm74-reference", "screens");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".spec.json"))
    .map((name) => {
      const commandName = name.replace(/\.spec\.json$/i, "");
      const spec = loadScreenSpec(commandName);
      return spec ? { commandName, spec } : null;
    })
    .filter((entry): entry is { commandName: string; spec: Ibm74ScreenSpec } => entry !== null)
    .sort((a, b) => a.commandName.localeCompare(b.commandName));
}

export function auditRenderedScreenFidelity(
  screenId: string,
  screen: { id: string; fields: Array<{ id: string; value?: string }> },
): ScreenFidelityResult {
  const legacy = loadLegacySpecs().find((spec) => spec.screenId === screenId);
  if (legacy) {
    return auditScreen(
      `${screenId.toLowerCase()}-fields`,
      `${screenId} legacy spec`,
      screen,
      legacy,
    );
  }
  const ibm74 = loadScreenSpec(screenId);
  if (ibm74) {
    return auditScreen(screenId, `${screenId} reference spec`, screen, ibm74);
  }
  return {
    id: screenId.toLowerCase(),
    title: `${screenId} layout-only fidelity`,
    pass: true,
  };
}

export function runCatalogScreenFidelityAudit(): ScreenFidelityResult[] {
  const specs = loadAllIbm74ScreenSpecs();
  const results: ScreenFidelityResult[] = [];

  for (const { commandName, spec } of specs) {
    if (LEGACY_STRICT_SCREENS.has(commandName)) continue;
    const screen = renderScreenForAudit(commandName);
    if (!screen) {
      results.push({
        id: commandName,
        title: `${commandName} renders screen`,
        pass: false,
        detail: "Command did not return a screen",
      });
      continue;
    }

    results.push(auditScreen(commandName, `${commandName} reference spec`, screen, spec));
  }

  return results;
}

export function runScreenFidelityAudit(): ScreenFidelityResult[] {
  const legacySpecs = loadLegacySpecs();
  const dspusrprfSpec = legacySpecs.find((s) => s.screenId === "DSPUSRPRF")!;
  const dspobjautSpec = legacySpecs.find((s) => s.screenId === "DSPOBJAUT")!;

  const dspusrprf = createDisplayUserProfileScreen("CLAIMS400", "QSECOFR");
  const authority = getObjectAuthorityDisplay("CLAIMS400", "PAYROLL", "PAYMST");
  const dspobjaut = authority
    ? createDisplayObjectAuthorityScreen("CLAIMS400", "QSECOFR", authority)
    : { id: "DSPOBJAUT", fields: [] as Array<{ id: string; value?: string }> };

  return [
    auditScreen("dspusrprf-fields", "DSPUSRPRF has required IBM i fields", dspusrprf, dspusrprfSpec),
    auditScreen("dspobjaut-fields", "DSPOBJAUT has required IBM i fields", dspobjaut, dspobjautSpec),
    ...runCatalogScreenFidelityAudit(),
  ];
}

export function formatScreenFidelityReport(results: ScreenFidelityResult[]): string {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  const lines = [
    `${APP_NAME} — Screen Fidelity Audit`,
    new Date().toISOString(),
    `PASS ${pass} · FAIL ${fail} · TOTAL ${results.length}`,
    "",
  ];
  for (const result of results) {
    lines.push(`${result.pass ? "PASS" : "FAIL"}  [${result.id}] ${result.title}`);
    if (result.detail) lines.push(`       ${result.detail}`);
  }
  return lines.join("\n");
}
