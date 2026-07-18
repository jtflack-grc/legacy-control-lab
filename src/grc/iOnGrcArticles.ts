/** Public i on GRC article links — articles are proof, the lab is pudding. */
export type GrcArticleLink = {
  title: string;
  url: string;
  hook: string;
  frameworkRefs?: string[];
};

/** Verified public URLs (Pulse slugs need the trailing hash suffix). */
export const ARTICLE_URLS = {
  OFFBOARDING:
    "https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie",
  BLUE_TEAM: "https://www.linkedin.com/pulse/can-you-blue-team-ibm-i-john-flack-w5bse",
  RED_TEAM: "https://www.linkedin.com/pulse/can-you-red-team-ibm-i-john-flack-pabze",
  DECISION_READY:
    "https://www.linkedin.com/pulse/audit-ready-decision-ready-john-flack-cpgfe",
  ISO27001_SERIES:
    "https://ibmireference.blogspot.com/search/label/IBM%20%22%28A%29i%20on%20GRC%20-%20ISO%2027001%22",
  ISO27701_CLAUSE_5:
    "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-5-the-ibm-i-activity-7434104511952187392-ITqt",
  ISO27701_CLAUSE_6:
    "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-6-the-ibm-i-activity-7438270345012248576-TDQI",
  ISO27701_CLAUSE_8:
    "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia",
  SOC2:
    "https://www.linkedin.com/pulse/soc-2-ibm-i-john-flack-0bj8e",
  COSO:
    "https://www.linkedin.com/pulse/frameworks-coso-ibm-i-john-flack-dcrne",
  BLACK_SWAN:
    "https://www.linkedin.com/pulse/black-swan-green-screen-john-flack-doyce",
} as const;

export const MISSION_ARTICLES: Record<string, GrcArticleLink> = {
  "CLAIMS-001": {
    title: "ISO 27001 & the IBM i (series)",
    url: ARTICLE_URLS.ISO27001_SERIES,
    hook: "Privileged access review on the green screen — the blog series this sandbox mirrors.",
    frameworkRefs: ["ISO 27001 A.9.2.5", "SOC 2 CC6.1"],
  },
  "CLAIMS-002": {
    title: "IBM i Offboarding: Profiles You Didn't Revoke",
    url: ARTICLE_URLS.OFFBOARDING,
    hook: "Dormant vendor IDs and TPRM offboarding — run the commands from the article here.",
    frameworkRefs: ["ISO 27001 A.9.2.5", "ISO 27001 A.9.2.6", "NIST AC-2(3)", "COBIT BAI09.02"],
  },
  "CLAIMS-003": {
    title: "i on GRC: ISO 27701, Clause 8 & the IBM i",
    url: ARTICLE_URLS.ISO27701_CLAUSE_8,
    hook: "Operational privacy — object auth, file layout, batch jobs, IFS flows, and audit journal.",
    frameworkRefs: ["ISO 27701 Clause 8", "Privacy operations", "PII processing"],
  },
  "CLAIMS-004": {
    title: "i on GRC: ISO 27701, Clause 6 & the IBM i",
    url: ARTICLE_URLS.ISO27701_CLAUSE_6,
    hook: "Privacy risk planning — authorization lists, profile authorities, and audit monitoring.",
    frameworkRefs: ["ISO 27701 Clause 6", "Authorization lists", "Measurable objectives"],
  },
  "CLAIMS-005": {
    title: "Can You Blue Team an IBM i?",
    url: ARTICLE_URLS.BLUE_TEAM,
    hook: "Detect and respond with WRKACTJOB, DSPAUDJRNE, DSPSECAUD, job log, and journal.",
    frameworkRefs: ["SOC 2 CC7.2", "Detect / respond", "IBM i monitoring"],
  },
  "CLAIMS-006": {
    title: "i on GRC: ISO 27701, Clause 5 & the IBM i",
    url: ARTICLE_URLS.ISO27701_CLAUSE_5,
    hook: "Profile ownership and accountability — PAYADMIN OWNER *NONE is the privacy gap.",
    frameworkRefs: ["ISO 27701 Clause 5", "Data owner", "Decision-ready findings"],
  },
  "CLAIMS-007": {
    title: "Red Team an IBM i",
    url: ARTICLE_URLS.RED_TEAM,
    hook: "Limited user LMTCPB(*YES) — escape attempts become findings when boundaries hold.",
    frameworkRefs: ["Red team", "LMTCPB", "Privilege boundary"],
  },
  "CLAIMS-008": {
    title: "SOC 2 & the IBM i",
    url: ARTICLE_URLS.SOC2,
    hook: "Map CC6/CC7 Trust Services criteria to profiles, object authority, journal, and detect/respond on the green screen.",
    frameworkRefs: ["SOC 2 CC6.1", "SOC 2 CC7.2", "Trust Services"],
  },
  "CLAIMS-009": {
    title: "Black Swan, Green Screen",
    url: ARTICLE_URLS.BLACK_SWAN,
    hook: "Tail risk on IBM i — batch failures, held jobs, operator messages, and uptime myths on the green screen.",
    frameworkRefs: ["ISO 27001 A.17.1", "Availability", "Tail risk", "QSYSOPR"],
  },
  "HOSPITAL-002": {
    title: "i on GRC: ISO 27701, Clause 8 & the IBM i (Hospital)",
    url: ARTICLE_URLS.ISO27701_CLAUSE_8,
    hook: "Operational privacy on HOSPITAL400 — object auth, file layout, batch, IFS, and journal.",
    frameworkRefs: ["ISO 27701 Clause 8", "PHI operations", "Hospital privacy"],
  },
  "CLAIMS-010": {
    title: "Frameworks: COSO & the IBM i",
    url: ARTICLE_URLS.COSO,
    hook: "Map COSO control environment to WRKCTRL, MAPCTRL, and green-screen control activity evidence.",
    frameworkRefs: ["COSO", "Control environment", "SOX ITGC"],
  },
};

export const TOPIC_ARTICLES: Record<string, GrcArticleLink> = {
  PRIVACY_OPERATIONS: MISSION_ARTICLES["CLAIMS-003"]!,
  OFFBOARDING: MISSION_ARTICLES["CLAIMS-002"]!,
  BLUE_TEAM: MISSION_ARTICLES["CLAIMS-005"]!,
  RED_TEAM: MISSION_ARTICLES["CLAIMS-007"]!,
  SOC2: MISSION_ARTICLES["CLAIMS-008"]!,
  BLACK_SWAN: MISSION_ARTICLES["CLAIMS-009"]!,
  AVAILABILITY: MISSION_ARTICLES["CLAIMS-009"]!,
  COSO: MISSION_ARTICLES["CLAIMS-010"]!,
  DECISION_READY: {
    title: "Audit-Ready Is Not Decision-Ready",
    url: ARTICLE_URLS.DECISION_READY,
    hook: "Findings need severity plus decision impact — who must act and by when.",
    frameworkRefs: ["Decision support", "Finding quality"],
  },
};

export const SCREEN_ARTICLES: Partial<Record<string, GrcArticleLink>> = {
  WRKUSRPRF: MISSION_ARTICLES["CLAIMS-002"],
  DSPUSRPRF: MISSION_ARTICLES["CLAIMS-006"],
  DSPOBJAUT: MISSION_ARTICLES["CLAIMS-001"],
  EDTOBJAUT: MISSION_ARTICLES["CLAIMS-007"],
  GRTOBJAUT: {
    ...MISSION_ARTICLES["CLAIMS-007"]!,
    hook: "Grant-object escape attempt — LMTCPB(*YES) profiles should fail with CPF9902.",
    frameworkRefs: ["Red team", "LMTCPB", "Privilege boundary"],
  },
  RVKOBJAUT: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Revoke authority as part of Clause 10 corrective action on PAYMST.",
    frameworkRefs: ["ISO 27701 Clause 10", "Corrective action"],
  },
  DSPNETA: {
    ...MISSION_ARTICLES["CLAIMS-007"]!,
    hook: "Read-only network recon — perimeter view without privilege escalation.",
    frameworkRefs: ["Red team", "Network surface"],
  },
  CHGAUT: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Change IFS data authority — Clause 10 remediation on integration paths.",
    frameworkRefs: ["ISO 27701 Clause 10", "IFS authority"],
  },
  CHGOBJAUD: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Object auditing values — pair with DSPJRN for monitoring evidence.",
    frameworkRefs: ["ISO 27701 Clause 10", "Audit configuration"],
  },
  CRTAUTL: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Create authorization list before EDTAUTL remediation.",
    frameworkRefs: ["ISO 27701 Clause 10", "Authorization lists"],
  },
  DSPPGM: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Program object detail — adopted authority review starts here.",
    frameworkRefs: ["ISO 27701 Clause 10", "Adopted authority"],
  },
  WRKOBJ: MISSION_ARTICLES["CLAIMS-001"],
  FINDING: TOPIC_ARTICLES["DECISION_READY"],
  WRKFINDING: TOPIC_ARTICLES["DECISION_READY"],
  DSPFD: MISSION_ARTICLES["CLAIMS-003"],
  DSPOBJD: MISSION_ARTICLES["CLAIMS-001"],
  DSPFFD: MISSION_ARTICLES["CLAIMS-003"],
  WRKJOBSCDE: MISSION_ARTICLES["CLAIMS-003"],
  DSPJOBSCDE: MISSION_ARTICLES["CLAIMS-003"],
  WRKLNK: MISSION_ARTICLES["CLAIMS-003"],
  WRKAUTL: MISSION_ARTICLES["CLAIMS-004"],
  DSPAUTL: {
    ...MISSION_ARTICLES["CLAIMS-004"]!,
    hook: "Who is on the PAYROLL authorization list?",
  },
  WRKOBJOWN: {
    title: "i on GRC: ISO 27701, Clause 10 & the IBM i",
    url: "https://www.linkedin.com/pulse/i-grc-is0-27701-clause-10-ibm-john-flack-6nz1e",
    hook: "Ownership patterns — sensitive objects owned by inactive or generic profiles.",
    frameworkRefs: ["ISO 27701 Clause 10", "Corrective action", "SOC 2 CC6.1"],
  },
  EDTAUTL: {
    title: "i on GRC: ISO 27701, Clause 10 & the IBM i",
    url: "https://www.linkedin.com/pulse/i-grc-is0-27701-clause-10-ibm-john-flack-6nz1e",
    hook: "Remediate access — edit PAYROLL authorization list membership and authority.",
    frameworkRefs: ["ISO 27701 Clause 10", "Authorization lists"],
  },
  ANZPRFACT: MISSION_ARTICLES["CLAIMS-002"],
  CHGACTPRFL: MISSION_ARTICLES["CLAIMS-002"],
  DSPJRN: {
    ...MISSION_ARTICLES["CLAIMS-005"]!,
    hook: "Detect and respond with journal + job log evidence.",
  },
  DSPSECAUD: {
    ...MISSION_ARTICLES["CLAIMS-004"]!,
    hook: "QAUDCTL plus authority-failure journal — monitoring baseline and signal.",
    frameworkRefs: ["ISO 27701 Clause 6", "QAUDCTL"],
  },
  DSPAUDJRNE: {
    ...MISSION_ARTICLES["CLAIMS-005"]!,
    hook: "Filter QAUDJRN by ENTTYP before you export to a SIEM.",
    frameworkRefs: ["SOC 2 CC7.2", "Journal triage"],
  },
  CPYAUDJRNE: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Export filtered journal entries — COSO monitoring activities need repeatable extracts.",
    frameworkRefs: ["COSO monitoring", "SOC 2 CC7.2", "QAUDJRN export"],
  },
  WRKACTJOB: {
    ...MISSION_ARTICLES["CLAIMS-005"]!,
    hook: "Live jobs — spot OLDVENDOR batch work on QBATCH.",
    frameworkRefs: ["Detect", "Active job review"],
  },
  DSPAUT: {
    ...MISSION_ARTICLES["CLAIMS-004"]!,
    hook: "Profile-level authorities are privacy risk inputs.",
  },
  DSPJOBLOG: {
    ...MISSION_ARTICLES["CLAIMS-005"]!,
    hook: "Command-level trace for incident timelines.",
    frameworkRefs: ["Respond", "Job log review"],
  },
  WRKSBMJOB: MISSION_ARTICLES["CLAIMS-009"],
  WRKSYSSTS: MISSION_ARTICLES["CLAIMS-009"],
  DSPMSG: {
    ...MISSION_ARTICLES["CLAIMS-009"]!,
    hook: "QSYSOPR operator queue — batch failures surface here before the SIEM.",
    frameworkRefs: ["Availability", "Operator response"],
  },
  DSPJOB: {
    ...MISSION_ARTICLES["CLAIMS-009"]!,
    hook: "Job detail — status, subsystem, and failure reason for batch tail risk.",
  },
  WRKCTRL: MISSION_ARTICLES["CLAIMS-010"],
  WORKSHOP: MISSION_ARTICLES["CLAIMS-010"],
  MAPCTRL: {
    ...MISSION_ARTICLES["CLAIMS-010"]!,
    hook: "Map a WRKFINDING row to an LCL control id — COSO control activity on the partition.",
  },
  WRKSQLSVC: {
    title: "Audit-Ready Is Not Decision-Ready",
    url: ARTICLE_URLS.DECISION_READY,
    hook: "QSYS2 SQL views are evidence engineering — tabular proof you can cite in findings.",
    frameworkRefs: ["Evidence engineering", "QSYS2", "RUNSQL"],
  },
  RUNSQL: {
    title: "Audit-Ready Is Not Decision-Ready",
    url: ARTICLE_URLS.DECISION_READY,
    hook: "Query live partition state — profiles, object auth, journal — not framework templates.",
    frameworkRefs: ["Evidence engineering", "Decision-ready"],
  },
  DSPSQLSVC: {
    title: "Audit-Ready Is Not Decision-Ready",
    url: ARTICLE_URLS.DECISION_READY,
    hook: "Sample SQL for each QSYS2 service — the repeatable query behind the green-screen option.",
    frameworkRefs: ["Evidence engineering", "IBM i Services"],
  },
  CMDSQL: {
    title: "ISO 27001 & the IBM i (series)",
    url: ARTICLE_URLS.ISO27001_SERIES,
    hook: "SQL services complement WRKUSRPRF and DSPOBJAUT for exportable access evidence.",
    frameworkRefs: ["ISO 27001 A.9", "QSYS2"],
  },
};

/** Commands highlighted on the HELP screen with linked articles. */
export const FEATURED_COMMAND_ARTICLES: Array<{ command: string; article: GrcArticleLink }> = [
  { command: "WRKUSRPRF", article: MISSION_ARTICLES["CLAIMS-002"]! },
  { command: "DSPJRN", article: MISSION_ARTICLES["CLAIMS-005"]! },
  { command: "WRKACTJOB", article: MISSION_ARTICLES["CLAIMS-005"]! },
  { command: "WRKAUTL", article: MISSION_ARTICLES["CLAIMS-004"]! },
  { command: "WRKFINDING", article: TOPIC_ARTICLES["DECISION_READY"]! },
];

export function articleForMission(missionId: string): GrcArticleLink | undefined {
  return MISSION_ARTICLES[missionId];
}

export function articleForScreen(screenId: string): GrcArticleLink | undefined {
  return SCREEN_ARTICLES[screenId.toUpperCase()];
}

export function articleForCommand(commandName: string): GrcArticleLink | undefined {
  return SCREEN_ARTICLES[commandName.trim().toUpperCase()];
}

export function articleForTopic(topic: string): GrcArticleLink | undefined {
  return TOPIC_ARTICLES[topic.trim().toUpperCase()];
}
