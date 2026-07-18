import { APP_NAME } from "../branding.js";
import { executeCatalogCommand } from "../ibmi-runtime/commandRuntime.js";
import { createSession, hydrateSessionFromProfile } from "../ibmi-runtime/sessionService.js";

export type AuthorityProbeResult = {
  id: string;
  title: string;
  pass: boolean;
  detail?: string;
};

function sessionAs(userName: string): ReturnType<typeof createSession> {
  const session = createSession("CLAIMS400");
  session.signedOn = true;
  session.userName = userName;
  hydrateSessionFromProfile(session, userName, "CLAIMS400");
  return session;
}

function expectDenied(userName: string, command: string): void {
  const result = executeCatalogCommand(sessionAs(userName), command.split(/\s+/)[0]!, command);
  if (result.kind !== "message" || !result.message.includes("CPF2209")) {
    throw new Error(`Expected authority failure for ${userName} ${command}, got ${result.kind}`);
  }
}

function expectAllowed(userName: string, command: string): void {
  const result = executeCatalogCommand(sessionAs(userName), command.split(/\s+/)[0]!, command);
  if (result.kind === "message" && result.message.includes("CPF2209")) {
    throw new Error(`Unexpected authority failure for ${userName} ${command}: ${result.message}`);
  }
}

function runProbe(
  id: string,
  title: string,
  fn: () => void,
): AuthorityProbeResult {
  try {
    fn();
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

export function runAuthorityAudit(): AuthorityProbeResult[] {
  return [
    runProbe("audit-denied-chgusrprf", "AUDIT cannot CHGUSRPRF without *SECADM", () => {
      expectDenied("AUDIT", "CHGUSRPRF USRPRF(APCLERK) STATUS(*DISABLED)");
    }),
    runProbe("audit-allowed-wrkusrprf", "AUDIT can WRKUSRPRF with *AUDITVIEW alias", () => {
      expectAllowed("AUDIT", "WRKUSRPRF");
    }),
    runProbe("audit-allowed-dspobjaut", "AUDIT can DSPOBJAUT for governance review", () => {
      expectAllowed("AUDIT", "DSPOBJAUT OBJ(PAYROLL/PAYMST)");
    }),
    runProbe("qsecofr-allowed-chgusrprf", "QSECOFR can CHGUSRPRF", () => {
      expectAllowed("QSECOFR", "CHGUSRPRF USRPRF(APCLERK) TEXT('test')");
    }),
    runProbe("qsecofr-allowed-grtobjaut", "QSECOFR can GRTOBJAUT", () => {
      expectAllowed("QSECOFR", "GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)");
    }),
    runProbe("audit-denied-grtobjaut", "AUDIT cannot GRTOBJAUT", () => {
      expectDenied("AUDIT", "GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)");
    }),
    runProbe("apclerk-denied-edtobjaut", "APCLERK cannot EDTOBJAUT with LMTCPB(*YES)", () => {
      const result = executeCatalogCommand(
        sessionAs("APCLERK"),
        "EDTOBJAUT",
        "EDTOBJAUT OBJ(PAYROLL/PAYMST)",
      );
      if (result.kind !== "message" || !result.message.includes("CPF9902")) {
        throw new Error(`Expected CPF9902 for APCLERK EDTOBJAUT, got ${result.kind}`);
      }
    }),
    runProbe("apclerk-denied-grtobjaut", "APCLERK cannot GRTOBJAUT self-grant on PAYMST", () => {
      const result = executeCatalogCommand(
        sessionAs("APCLERK"),
        "GRTOBJAUT",
        "GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*ALL)",
      );
      if (result.kind !== "message" || !result.message.includes("CPF9902")) {
        throw new Error(`Expected CPF9902 for APCLERK GRTOBJAUT, got ${result.kind}`);
      }
    }),
  ];
}

export function formatAuthorityReport(results: AuthorityProbeResult[]): string {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  const lines = [
    `${APP_NAME} — Authority Audit`,
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
