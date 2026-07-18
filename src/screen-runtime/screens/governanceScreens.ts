import type { ScreenDefinition } from "../screen.js";
import type { SecurityFinding } from "../../ibmi-runtime/securityAnalysisService.js";
import { listSecuritySystemValues } from "../../ibmi-runtime/systemValueService.js";
import { createInfoScreen, menuHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";

export function createSecurityAnalysisScreen(
  screenId: "ANZDFTPWD" | "ANZPRFACT",
  title: string,
  systemName: string,
  userName: string,
  findings: SecurityFinding[],
  headerLines: string[] = [],
): ScreenDefinition {
  const lines =
    findings.length > 0
      ? findings.map((finding) => `${finding.userName.padEnd(12)} ${finding.finding}`)
      : ["No findings detected in synthetic scenario."];

  return createInfoScreen(screenId, title, systemName, userName, [...headerLines, ...lines]);
}

export function createDisplaySecurityAttributesScreen(systemName: string, userName: string): ScreenDefinition {
  const values = listSecuritySystemValues(systemName).filter((value) =>
    ["QSECURITY", "QAUDCTL", "QAUDLVL", "QCRTAUT", "QMAXSIGN", "QPWDEXPITV", "QLMTSECOFR", "QALWOBJRST", "QRMTSIGN"].includes(
      value.name,
    ),
  );
  const lines = values.map(
    (value) => `${value.name.padEnd(12)} ${value.value.padEnd(24).slice(0, 24)} ${value.category}`,
  );
  return createInfoScreen("DSPSECA", "Display Security Attributes", systemName, userName, lines);
}

export function createDisplayLogScreen(systemName: string, userName: string): ScreenDefinition {
  return createInfoScreen("DSPLOG", "Display Log", systemName, userName, [
    "06/08/26 07:42:11 PW Invalid password attempt for BACKUPADM.",
    "06/08/26 09:15:33 AF Authority failure for OLDVENDOR on CLMMAINT.",
    "06/08/26 10:02:07 CP Command WRKACTJOB run by OLDVENDOR.",
    "06/08/26 11:30:44 SV System value QSECURITY displayed by PAYADMIN.",
    "06/08/26 14:18:02 DO Object delete attempt on QCLSRC by OLDVENDOR.",
  ]);
}

export function createWorkOutputQueueScreen(systemName: string): ScreenDefinition {
  const fields = [
    ...menuHeader("Work with Output Queue", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("HDR", 4, 6, "  Queue     Library     Status"),
    outputField("LINE", 5, 6, "  --------- ----------- ------"),
    outputField("Q1", 6, 6, "  QPRINT    QGPL        READY"),
    outputField("Q2", 7, 6, "  QPGMR     QGPL        READY"),
    standardFunctionKeys(),
  ];

  return {
    id: "WRKOUTQ",
    title: "Work with Output Queue",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createPtfScreen(
  screenId: "DSPPTF" | "WRKPTFGRP" | "WRKPRD",
  title: string,
  systemName: string,
  userName: string,
): ScreenDefinition {
  const lines =
    screenId === "DSPPTF"
      ? ["No PTFs pending for CLAIMS400 training partition."]
      : screenId === "WRKPTFGRP"
        ? ["SF99740 - IBM i Base Group - Status: Installed"]
        : ["5770-SS1 Base Operating System - Status: Installed"];

  return createInfoScreen(screenId, title, systemName, userName, lines);
}

export function createDisplayMissionScreen(
  systemName: string,
  userName: string,
  mission: { id: string; title: string; briefing: string; persona?: string | null },
  progress?: { requiredCollected: number; requiredTotal: number },
  evidenceHints: string[] = [],
): ScreenDefinition {
  const defaultEvidence = [
    "  WRKUSRPRF/DSPUSRPRF, DSPSYSVAL QSECURITY/QAUDCTL",
    "  DSPOBJAUT PAYROLL/PAYMST, DSPJRN, optional DSPMSG",
  ];
  const evidenceLines =
    evidenceHints.length > 0
      ? evidenceHints.map((line) => (line.startsWith("  ") ? line : `  ${line}`))
      : defaultEvidence;

  const lines = [
    `Mission ID . . . . . . . . . . : ${mission.id}`,
    `Title  . . . . . . . . . . . . : ${mission.title}`,
    mission.persona ? `Persona . . . . . . . . . . . . : ${mission.persona}` : "",
    "",
    mission.briefing,
    "",
    "Required evidence:",
    ...evidenceLines,
    "",
    progress
      ? `Evidence collected: ${progress.requiredCollected}/${progress.requiredTotal} required (DSPEVID).`
      : "Run DSPEVID to review evidence coverage.",
    "Write findings (option 8), then SUBMITMSN.",
  ].filter(Boolean);

  return createInfoScreen("DSPMISSION", "Display Mission", systemName, userName, lines);
}

export function createWorkJournalScreen(
  screenId: "WRKJRN" | "WRKJRNA",
  systemName: string,
  userName: string,
): ScreenDefinition {
  return createInfoScreen(
    screenId,
    "Work with Journal Attributes",
    systemName,
    userName,
    [
      "Journal . . . . . . . . . . . : QSYS/QAUDJRN",
      "Library . . . . . . . . . . . : QSYS",
      "Receiver . . . . . . . . . . : QAUDJRN",
      "Status . . . . . . . . . . . : ACTIVE",
      "Manage receivers . . . . . . . : *SYSDFT",
    ],
  );
}
