import { APP_NAME } from "../branding.js";
import type { SessionAdapter } from "../tn5250-host/sessionAdapter.js";
import { createSessionAdapter } from "../tn5250-host/sessionAdapter.js";
import { AID_ENTER, AID_PF3 } from "../tn5250-host/aid.js";
import { appendTelnetEor, wrapGds, GdsOp } from "../tn5250-host/gds.js";
import { asciiToEbcdic } from "../tn5250-host/ebcdic.js";
import {
  CMD_SB,
  CMD_SE,
  CMD_WILL,
  IAC,
  NE_IS,
  OPT_BINARY,
  OPT_EOR,
  OPT_NEW_ENVIRON,
  OPT_TERMINAL_TYPE,
} from "../tn5250-host/telnetNegotiation.js";
import { signonUserInputCol, SIGNON_ROWS } from "../screen-runtime/screens/signonLayout.js";
import { menuParentId, SIGNOFF_MENU_SELECTION } from "../tn5250-host/menuNavigation.js";

export type MenuNavProbeResult = {
  id: string;
  title: string;
  pass: boolean;
  detail?: string;
};

function completeNegotiation(adapter: SessionAdapter): void {
  adapter.handleData(Buffer.from([IAC, CMD_WILL, OPT_BINARY]));
  adapter.handleData(Buffer.from([IAC, CMD_WILL, OPT_EOR]));
  adapter.handleData(Buffer.from([IAC, CMD_WILL, OPT_TERMINAL_TYPE]));
  adapter.handleData(Buffer.from([IAC, CMD_WILL, OPT_NEW_ENVIRON]));
  adapter.handleData(
    Buffer.from([
      IAC, CMD_SB, OPT_TERMINAL_TYPE, 0x00,
      ...Buffer.from("IBM-5292-2", "ascii"),
      IAC, CMD_SE,
    ]),
  );
  adapter.handleData(Buffer.from([IAC, CMD_SB, OPT_NEW_ENVIRON, NE_IS, IAC, CMD_SE]));
}

function buildEnterFrame(
  row: number,
  col: number,
  fields: Array<{ row: number; col: number; value: string }>,
): Buffer {
  const parts: Buffer[] = [Buffer.from([row, col, AID_ENTER])];
  for (const field of fields) {
    parts.push(Buffer.from([0x11, field.row, field.col]));
    parts.push(asciiToEbcdic(field.value));
  }
  return appendTelnetEor(wrapGds(Buffer.concat(parts), GdsOp.PUT_GET_OPERATION));
}

function buildAidFrame(aid: number): Buffer {
  return appendTelnetEor(wrapGds(Buffer.from([1, 1, aid]), GdsOp.PUT_GET_OPERATION));
}

function signOnAdapter(
  adapter: SessionAdapter,
  user: string,
  password: string,
): SessionAdapter {
  completeNegotiation(adapter);
  const userCol = signonUserInputCol();
  adapter.handleData(
    buildEnterFrame(SIGNON_ROWS.user, userCol, [
      { row: SIGNON_ROWS.user, col: userCol, value: user.padEnd(10, " ").slice(0, 10) },
      { row: SIGNON_ROWS.password, col: userCol, value: password.padEnd(10, " ").slice(0, 10) },
    ]),
  );
  return adapter;
}

function createSignedOnAdapter(): SessionAdapter {
  return signOnAdapter(
    createSessionAdapter({ systemName: "CLAIMS400", devFrameLog: false }),
    "AUDIT",
    "TRAIN",
  );
}

function createSignedOnQsecofrAdapter(): SessionAdapter {
  return signOnAdapter(
    createSessionAdapter({ systemName: "CLAIMS400", devFrameLog: false }),
    "QSECOFR",
    "TRAIN",
  );
}

function menuCommand(adapter: SessionAdapter, selection: string): void {
  const commandField = adapter.getCurrentScreen().fields.find((field) => field.id === "COMMAND");
  if (!commandField) throw new Error(`No COMMAND field on ${adapter.getCurrentScreen().id}`);
  adapter.handleData(
    buildEnterFrame(commandField.row, commandField.col + 1, [
      {
        row: commandField.row,
        col: commandField.col + 1,
        value: selection.padEnd(commandField.length, " "),
      },
    ]),
  );
}

function runProbe(
  id: string,
  title: string,
  fn: (adapter: SessionAdapter) => void,
): MenuNavProbeResult {
  try {
    fn(createSignedOnAdapter());
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

function expectScreen(adapter: SessionAdapter, screenId: string): void {
  const actual = adapter.getCurrentScreen().id;
  if (actual !== screenId) {
    throw new Error(`Expected screen ${screenId}, got ${actual}`);
  }
}

export function runMenuNavigationAudit(): MenuNavProbeResult[] {
  return [
    runProbe("f3-main-stays-signed-on", "F3 on MAIN does not sign off", (adapter) => {
      expectScreen(adapter, "MAIN");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "MAIN");
      if (!adapter.getSession().signedOn) throw new Error("Session signed off from MAIN");
    }),

    runProbe("f3-security-to-main", "F3 on SECURITY returns to MAIN", (adapter) => {
      menuCommand(adapter, "5");
      expectScreen(adapter, "SECURITY");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "MAIN");
    }),

    runProbe("f3-audit-to-main", "F3 on AUDIT returns to MAIN", (adapter) => {
      menuCommand(adapter, "1");
      expectScreen(adapter, "AUDIT");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "MAIN");
    }),

    runProbe("f3-secstock-to-security", "F3 on SECSTOCK returns to SECURITY", (adapter) => {
      menuCommand(adapter, "5");
      expectScreen(adapter, "SECURITY");
      menuCommand(adapter, "20");
      expectScreen(adapter, "SECSTOCK");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "SECURITY");
    }),

    runProbe("f3-wrkusrprf-to-security", "F3 on WRKUSRPRF opened from SECURITY returns to SECURITY", (adapter) => {
      menuCommand(adapter, "5");
      expectScreen(adapter, "SECURITY");
      menuCommand(adapter, "1");
      expectScreen(adapter, "WRKUSRPRF");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "SECURITY");
    }),

    runProbe("qsecofr-signon-security", "QSECOFR signs on to SECURITY home menu", () => {
      const adapter = createSignedOnQsecofrAdapter();
      expectScreen(adapter, "SECURITY");
      if (adapter.getSession().lane !== "operator") {
        throw new Error(`Expected operator lane, got ${adapter.getSession().lane}`);
      }
    }),

    runProbe("qsecofr-f3-stays-security", "F3 on SECURITY home stays on SECURITY for operator lane", () => {
      const adapter = createSignedOnQsecofrAdapter();
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "SECURITY");
    }),

    runProbe("f3-wrkusrprf-to-audit", "F3 on WRKUSRPRF opened from AUDIT returns to AUDIT", (adapter) => {
      menuCommand(adapter, "1");
      expectScreen(adapter, "AUDIT");
      menuCommand(adapter, "2");
      expectScreen(adapter, "WRKUSRPRF");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "AUDIT");
    }),

    runProbe("f3-cmdsec-to-cmdlab", "F3 on CMDSEC opened from CMDLAB returns to CMDLAB", (adapter) => {
      menuCommand(adapter, "9");
      expectScreen(adapter, "CMDLAB");
      menuCommand(adapter, "GO CMDSEC");
      expectScreen(adapter, "CMDSEC");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "CMDLAB");
    }),

    runProbe("f3-wrkrange-to-main", "F3 on WRKRANGE opened from MAIN returns to MAIN", (adapter) => {
      menuCommand(adapter, "2");
      expectScreen(adapter, "WRKRANGE");
      adapter.handleData(buildAidFrame(AID_PF3));
      expectScreen(adapter, "MAIN");
    }),

    runProbe("menu-90-signoff", `Menu option ${SIGNOFF_MENU_SELECTION} signs off`, (adapter) => {
      menuCommand(adapter, SIGNOFF_MENU_SELECTION);
      expectScreen(adapter, "SIGNON");
      if (adapter.getSession().signedOn) throw new Error("Session still signed on after option 90");
    }),

    runProbe("signoff-command", "SIGNOFF command signs off from MAIN", (adapter) => {
      menuCommand(adapter, "SIGNOFF");
      expectScreen(adapter, "SIGNON");
    }),

    runProbe("parent-map-security-auditor", "SECURITY parent menu is MAIN for auditor lane", () => {
      if (menuParentId("SECURITY", "auditor") !== "MAIN") {
        throw new Error(`SECURITY parent is ${menuParentId("SECURITY", "auditor") ?? "none"}`);
      }
    }),

    runProbe("parent-map-security-operator", "SECURITY is root for operator lane", () => {
      if (menuParentId("SECURITY", "operator") !== undefined) {
        throw new Error(`SECURITY should be root for operator, got parent ${menuParentId("SECURITY", "operator")}`);
      }
    }),

    runProbe("parent-map-cmdsec-auditor", "CMDSEC parent menu is CMDLAB for auditor lane", () => {
      if (menuParentId("CMDSEC", "auditor") !== "CMDLAB") {
        throw new Error(`CMDSEC parent is ${menuParentId("CMDSEC", "auditor") ?? "none"}`);
      }
    }),

    runProbe("parent-map-cmdsec-operator", "CMDSEC parent menu is SECURITY for operator lane", () => {
      if (menuParentId("CMDSEC", "operator") !== "SECURITY") {
        throw new Error(`CMDSEC parent is ${menuParentId("CMDSEC", "operator") ?? "none"}`);
      }
    }),
  ];
}

export function formatMenuNavigationReport(results: MenuNavProbeResult[]): string {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  const lines = [
    `${APP_NAME} — Menu Navigation Audit`,
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
