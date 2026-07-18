export type MissionStep = {
  order: number;
  menu?: string;
  action: string;
  detail: string;
};

export type CoachTips = {
  signOn: { user: string; password: string };
  connection: { model: string; bridgePath: string };
  keyboard: string[];
  subfile: Array<{ screen: string; options: string }>;
  commands: string[];
};

export const CLAIMS_004_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "CLAIMS-004 — ISO 27701 Clause 6 privacy risk planning." },
  { order: 2, action: "Authorization lists", detail: "WRKAUTL → option 5 PAYROLL → DSPAUTL." },
  { order: 3, action: "Profile authorities", detail: "DSPAUT USER(BACKUPADM) or WRKUSRPRF option 8." },
  { order: 4, action: "Security audit view", detail: "DSPSECAUD or DSPAUDJRNE ENTTYP(AF)." },
  { order: 5, menu: "4", action: "Audit journal", detail: "DSPJRN JRN(QSYS/QAUDJRN)." },
  { order: 6, menu: "8", action: "Write finding", detail: "Map autl + authorities + monitoring to privacy objectives." },
  { order: 7, menu: "11", action: "Submit mission", detail: "Export report under data/reports/." },
];

export const CLAIMS_006_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "CLAIMS-006 — ISO 27701 Clause 5 profile ownership." },
  { order: 2, menu: "2", action: "Work with user profiles", detail: "WRKUSRPRF — who touches payroll data?" },
  { order: 3, action: "Display PAYADMIN", detail: "DSPUSRPRF USRPRF(PAYADMIN) — OWNER field." },
  { order: 4, action: "SQL ownership view", detail: "RUNSQL → QSYS2.USER_INFO for PAYADMIN." },
  { order: 5, menu: "8", action: "Write finding", detail: "WRKFINDING — decision impact required." },
  { order: 6, menu: "11", action: "Submit mission", detail: "Export ownership workpaper." },
];

export const CLAIMS_007_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "CLAIMS-007 — Red Team as APCLERK." },
  { order: 2, action: "Own profile", detail: "DSPUSRPRF USRPRF(APCLERK) — LMTCPB(*YES)." },
  { order: 3, action: "Escape attempt", detail: "GRTOBJAUT or EDTOBJAUT on PAYROLL/PAYMST." },
  { order: 4, action: "Network recon", detail: "DSPNETA — read-only perimeter view." },
  { order: 5, menu: "8", action: "Write finding", detail: "Document boundary — denial is success." },
  { order: 6, menu: "11", action: "Submit mission", detail: "Export Red Team workpaper." },
];

export const CLAIMS_005_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "CLAIMS-005 — Blue Team detect and respond." },
  { order: 2, menu: "5", action: "Work with active jobs", detail: "WRKACTJOB — OLDVENDOR / VENDORJOB on QBATCH." },
  { order: 3, action: "Filtered journal", detail: "DSPAUDJRNE ENTTYP(AF PW)." },
  { order: 4, action: "Security audit", detail: "DSPSECAUD — QAUDCTL + AF entries." },
  { order: 5, menu: "7", action: "Job log", detail: "DSPJOBLOG for command trace." },
  { order: 6, menu: "4", action: "Full journal", detail: "DSPJRN — build incident timeline." },
  { order: 7, menu: "8", action: "Write finding", detail: "Detect without response workflow." },
  { order: 8, menu: "11", action: "Submit mission", detail: "Export Blue Team workpaper." },
];

export const CLAIMS_003_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "CLAIMS-003 — ISO 27701 Clause 8 privacy operations." },
  { order: 2, action: "Object authority on PAYMST", detail: "DSPOBJAUT OBJ(PAYROLL/PAYMST) OBJTYPE(*FILE)." },
  { order: 3, action: "File description / PII fields", detail: "DSPFD FILE(PAYROLL/PAYMST) — note SSN in field list." },
  { order: 4, action: "Payroll batch schedule", detail: "WRKJOBSCDE — option 5 on PAYIFSEXP." },
  { order: 5, action: "IFS payroll path", detail: "WRKLNK OBJ('/payroll') — paymst.sym symlink." },
  { order: 6, menu: "4", action: "Display audit journal", detail: "DSPJRN — sensitive object access events." },
  { order: 7, menu: "8", action: "Write privacy finding", detail: "Reference object auth, SSN field, batch, and IFS." },
  { order: 8, menu: "11", action: "Submit mission", detail: "Export report under data/reports/." },
];

export const DEFAULT_STEPS: MissionStep[] = [
  { order: 1, menu: "9", action: "Display mission briefing", detail: "Read the scenario on the green screen (menu 9 mirrors this panel)." },
  { order: 2, menu: "1", action: "Work with system values", detail: "Option 5 beside QSECURITY and QAUDCTL." },
  { order: 3, menu: "2", action: "Work with user profiles", detail: "Review BACKUPADM, OLDVENDOR, disabled QPGMR." },
  { order: 4, menu: "3", action: "Work with objects", detail: "Option 8 beside PAYROLL/PAYMST for authority." },
  { order: 5, menu: "4", action: "Display audit journal", detail: "Password failures, authority failures, profile events." },
  { order: 6, menu: "10", action: "Display evidence coverage", detail: "Confirm required evidence is checked off in the session." },
  { order: 7, menu: "8", action: "Write audit finding", detail: "Record at least one finding before submit." },
  { order: 8, menu: "11", action: "Submit mission", detail: "Review score and exported report under data/reports/." },
];

export const OPERATOR_STEPS: MissionStep[] = [
  { order: 1, menu: "2", action: "Work with system values", detail: "Review QSECURITY and QAUDCTL from the SECURITY menu." },
  { order: 2, menu: "1", action: "Work with user profiles", detail: "Administer or review profiles including BACKUPADM and OLDVENDOR." },
  { order: 3, menu: "4", action: "Work with object authorities", detail: "Option 8 on WRKOBJ or DSPOBJAUT OBJ(PAYROLL/PAYMST)." },
  { order: 4, menu: "3", action: "Display audit journal", detail: "DSPJRN for password, authority, and profile events." },
  { order: 5, action: "Display privileged session", detail: "DSPPRVSSN or SECURITY menu 12 → option 2." },
  { order: 6, action: "Generate privileged report", detail: "GENRPT TYPE(*PRIV) exports command transcript." },
];

export const OPERATOR_TIPS: CoachTips = {
  signOn: { user: "QSECOFR", password: "TRAIN" },
  connection: { model: "IBM-5292-2", bridgePath: "/tn5250/" },
  keyboard: [
    "IBM i is command-driven — menu option or full CL on the ===> line, then Enter.",
    "F3 / F12 — exit one level; from SECURITY home, F3 stays on SECURITY (operator lane).",
    "F4 — prompt command parameters (WRKUSRPRF, CHGUSRPRF, DSPOBJAUT, …).",
    "F5 — refresh subfile screens (WRKUSRPRF, WRKSYSVAL, DSPJRN).",
    "F9 — retrieve previous commands (cycles history on any ===> line).",
    "Option 90 or SIGNOFF — end interactive session (returns to sign-on).",
    "Field Exit (Tab) — move between input fields on sign-on and command entry.",
  ],
  subfile: [
    { screen: "WRKUSRPRF", options: "5 = profile · 8 = authority · 12 = work objects" },
    { screen: "WRKSYSVAL", options: "5 = display system value detail" },
    { screen: "WRKOBJ", options: "8 = object authority" },
    { screen: "DSPJRN", options: "5 = journal entry detail" },
  ],
  commands: [
    "WRKUSRPRF",
    "DSPUSRPRF USRPRF(BACKUPADM)",
    "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)",
    "WRKSYSVAL / DSPSYSVAL SYSVAL(QSECURITY)",
    "DSPOBJAUT OBJ(PAYROLL/PAYMST)",
    "GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)",
    "RVKOBJAUT OBJ(PAYROLL/PAYMST) USER(OLDVENDOR)",
    "DSPJRN",
    "DSPJOBLOG",
    "DSPMSG MSGQ(QSYSOPR)",
    "DSPPRVSSN",
    "GENRPT TYPE(*PRIV)",
    "SIGNOFF",
  ],
};

export const DEFAULT_TIPS: CoachTips = {
  signOn: { user: "AUDIT", password: "TRAIN" },
  connection: { model: "IBM-5292-2", bridgePath: "/tn5250/" },
  keyboard: [
    "Enter submits the current screen or command line.",
    "F3 / F12 go back one menu level. Use option 90 or SIGNOFF to end the session.",
    "F5 refreshes list screens (WRKUSRPRF, DSPJRN, etc.).",
    "F9 retrieves prior commands — press repeatedly to walk back through history.",
    "Type menu numbers or full CL commands on the ===> line.",
  ],
  subfile: [
    { screen: "WRKSYSVAL", options: "5 = display system value detail" },
    { screen: "WRKUSRPRF", options: "5 = profile · 8 = authority · 12 = work objects" },
    { screen: "WRKOBJ", options: "5 = object description · 8 = object authority" },
    { screen: "DSPJRN", options: "5 = journal entry detail" },
    { screen: "WRKSQLSVC", options: "5 = display sample SQL · 6 = run sample query (F7/F8 to page)" },
  ],
  commands: [
    "WRKSQLSVC",
    "RUNSQL SQL('select user_name, status from qsys2.user_info')",
    "DSPUSRPRF USRPRF(BACKUPADM)",
    "DSPSYSVAL SYSVAL(QSECURITY)",
    "DSPOBJAUT OBJ(PAYROLL/PAYMST)",
    "DSPMSG MSGQ(QSYSOPR)",
  ],
};
