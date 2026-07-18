import type { ScreenId } from "../screen-runtime/screen.js";
import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { ARTICLE_URLS, FEATURED_COMMAND_ARTICLES, MISSION_ARTICLES, type GrcArticleLink } from "./iOnGrcArticles.js";
import {
  getGrcSqlEvidenceQuery,
  previewSqlEvidence,
  type SqlEvidenceEngineeringPanel,
} from "./grcSqlEvidenceCatalog.js";

export type EvidenceFocusItem = {
  theme: string;
  meta?: string;
  checkboxGap?: string;
  grcProof: string;
  command?: string;
  sql?: string;
  runCommand?: string;
  columns?: string[];
  rows?: string[][];
  rowCount?: number;
  truncated?: boolean;
  message?: string;
};

export type EvidenceFocusCategory = {
  label: string;
  blurb: string;
  items: EvidenceFocusItem[];
};

export type EvidenceFocusKind = "sql" | "journal" | "atlas" | "pdm" | "operator";

export type EvidenceFocusPanel = {
  kind: EvidenceFocusKind;
  headline: string;
  statsLine?: string;
  contrast: { checkbox: string; queryable: string };
  lead?: string;
  article?: GrcArticleLink;
  categories: EvidenceFocusCategory[];
};

function sqlItemFromPreview(
  preview: ReturnType<typeof previewSqlEvidence>,
): EvidenceFocusItem {
  return {
    theme: preview.theme,
    meta: [preview.serviceView, preview.framework].filter(Boolean).join(" · "),
    checkboxGap: preview.checkboxGap,
    grcProof: preview.grcProof,
    sql: preview.sql,
    runCommand: preview.runCommand,
    columns: preview.columns,
    rows: preview.rows,
    rowCount: preview.rowCount,
    truncated: preview.truncated,
    message: preview.message,
  };
}

export function evidenceFocusFromSqlPanel(panel: SqlEvidenceEngineeringPanel): EvidenceFocusPanel {
  return {
    kind: "sql",
    headline: panel.headline,
    statsLine: `${panel.stats.queryCount} repeatable queries · ${panel.stats.viewCount} QSYS2 services · ${panel.stats.liveSource}`,
    contrast: panel.contrast,
    lead:
      "Green screen: MAIN → 8 (WRKSQLSVC) · option 5=display · 6=run sample · coach rail lists the full repeatable query pack.",
    article: panel.article,
    categories: panel.categories.map((category) => ({
      label: category.label,
      blurb: category.blurb,
      items: category.queries.map(sqlItemFromPreview),
    })),
  };
}

const JOURNAL_GREEN_SCREEN: EvidenceFocusItem[] = [
  {
    theme: "Full journal browse",
    meta: "DSPJRN · QAUDJRN",
    checkboxGap: "Exported PDF journal extracts lose sortable columns and ENTTYP filters.",
    grcProof: "Complete security journal on the partition — baseline for monitoring controls.",
    command: "DSPJRN JRN(QSYS/QAUDJRN)",
  },
  {
    theme: "Filtered by entry type",
    meta: "DSPAUDJRNE · Blue Team triage",
    checkboxGap: "SIEM dashboards summarize; auditors need ENTTYP(AF PW) at the source.",
    grcProof: "Authority and password events isolated for incident review.",
    command: "DSPAUDJRNE JRN(QSYS/QAUDJRN) ENTTYP(AF PW)",
  },
  {
    theme: "Security audit configuration",
    meta: "DSPSECAUD · Clause 6",
    checkboxGap: "Policy language about QAUDCTL does not show AF rows beside the control value.",
    grcProof: "QAUDCTL system value and AF journal entries on one display.",
    command: "DSPSECAUD",
  },
];

const JOURNAL_CORRELATION: EvidenceFocusItem[] = [
  {
    theme: "Correlate job → log → journal",
    meta: "Blue Team chain",
    checkboxGap: "Ticket narratives without green-screen correlation are reconstruction, not evidence.",
    grcProof: "WRKACTJOB names the job; DSPJOBLOG shows the command; DSPJRN timestamps the event.",
    command: "WRKACTJOB · DSPJOBLOG · DSPAUDJRNE ENTTYP(AF PW)",
  },
  {
    theme: "Operator queue signal",
    meta: "DSPMSG QSYSOPR",
    checkboxGap: "Alerting runbooks rarely cite the QSYSOPR message that preceded the journal row.",
    grcProof: "Batch failures and authority errors surface on QSYSOPR before SIEM ingestion.",
    command: "DSPMSG MSGQ(QSYSOPR)",
  },
];

export function buildJournalEvidencePanel(
  screenId: ScreenId,
  systemName: string,
  session?: IbmiSession,
): EvidenceFocusPanel {
  const journalSqlIds = ["journal-af-pw", "journal-cp", "jobs-batch", "joblog-session"];
  const sqlItems = journalSqlIds
    .map((id) => getGrcSqlEvidenceQuery(id))
    .filter((query): query is NonNullable<typeof query> => Boolean(query))
    .map((query) => sqlItemFromPreview(previewSqlEvidence(systemName, query, session)));

  const screenLead: Record<string, string> = {
    DSPJRN: "Browse QAUDJRN on the green screen — F7/F8 pages entries. Pair with SQL on WRKSQLSVC for exportable rows.",
    DSPAUDJRNE: "ENTTYP filters AF/PW/CP — triage before forwarding to a SIEM. Option 6 on WRKSQLSVC runs the SQL equivalent.",
    DSPSECAUD: "QAUDCTL plus AF entries — Clause 6 monitoring baseline and signal on one screen.",
  };

  return {
    kind: "journal",
    headline: "Evidence engineering — audit journal & detect",
    statsLine: `${JOURNAL_GREEN_SCREEN.length} green-screen paths · ${sqlItems.length} QSYS2 queries · ${systemName}`,
    contrast: {
      checkbox: "SIEM slides and checkbox logging policies describe what should be monitored.",
      queryable:
        "DSPJRN / DSPAUDJRNE rows and QSYS2.DISPLAY_JOURNAL return timestamps, users, and ENTTYP you can cite in findings.",
    },
    lead: screenLead[screenId] ?? screenLead.DSPJRN,
    article: MISSION_ARTICLES["CLAIMS-005"],
    categories: [
      {
        label: "Green-screen journal",
        blurb: "Read at source on QAUDJRN before exporting to a workbook.",
        items: JOURNAL_GREEN_SCREEN,
      },
      {
        label: "Queryable equivalents",
        blurb: "Repeatable SQL from WRKSQLSVC — same partition state, sortable columns.",
        items: sqlItems,
      },
      {
        label: "Correlate & respond",
        blurb: "Journal rows are stronger when tied to jobs, logs, and operator messages.",
        items: JOURNAL_CORRELATION,
      },
    ],
  };
}

const ATLAS_GROUPS: EvidenceFocusCategory[] = [
  {
    label: "Access & offboarding",
    blurb: "Profile inventory, privileged scope, and dormant IDs.",
    items: [
      {
        theme: "Work with user profiles",
        meta: "CLAIMS-001 / 002 · WRKUSRPRF",
        checkboxGap: "User lists in workpapers go stale the moment a profile is enabled.",
        grcProof: "Interactive profile inventory — option 5 displays, option 8 authorities.",
        command: "WRKUSRPRF",
      },
      {
        theme: "Display user profile",
        meta: "CLAIMS-006 · DSPUSRPRF",
        checkboxGap: "Recertification templates rarely show *ALLOBJ beside last sign-on date.",
        grcProof: "Point-in-time profile detail including special authorities and status.",
        command: "DSPUSRPRF USRPRF(PAYADMIN)",
      },
      {
        theme: "Inactive profile analysis",
        meta: "CLAIMS-002 · ANZPRFACT",
        checkboxGap: "Offboarding tickets without ANZPRFACT output are assertion not proof.",
        grcProof: "Profiles exceeding INACT threshold — vendor and dormant privileged IDs.",
        command: "ANZPRFACT INACT(90)",
      },
      {
        theme: "System security values",
        meta: "CLAIMS-001 · DSPSYSVAL",
        checkboxGap: "QSECURITY level in a policy doc ≠ the value on the partition today.",
        grcProof: "QSECURITY, QAUDCTL, and related baseline values.",
        command: "DSPSYSVAL SYSVAL(QSECURITY)",
      },
    ],
  },
  {
    label: "Privacy & object authority",
    blurb: "Clause 8 operational proof — who can touch payroll data.",
    items: [
      {
        theme: "Object authority",
        meta: "CLAIMS-001 / 003 · DSPOBJAUT",
        checkboxGap: "Data-flow diagrams skip *PUBLIC authority on PAYMST.",
        grcProof: "User and *PUBLIC authority on sensitive files.",
        command: "DSPOBJAUT OBJ(PAYROLL/PAYMST) OBJTYPE(*FILE)",
      },
      {
        theme: "File field description",
        meta: "CLAIMS-003 · DSPFFD",
        checkboxGap: "Privacy inventories in Excel may not name the SSN column in the native file.",
        grcProof: "Column names and lengths — where PII lives on IBM i.",
        command: "DSPFFD FILE(PAYROLL/PAYMST)",
      },
      {
        theme: "IFS integration path",
        meta: "CLAIMS-003 · WRKLNK",
        checkboxGap: "API assessments often ignore IFS symlinks beside DB2 authority.",
        grcProof: "Symlink from /payroll to PAYROLL/PAYMST — follow the data flow.",
        command: "WRKLNK OBJ('/payroll')",
      },
      {
        theme: "Authorization lists",
        meta: "CLAIMS-004 · WRKAUTL",
        checkboxGap: "List membership in a spreadsheet is not DSPAUTL output.",
        grcProof: "PAYROLL autl members vs DSPOBJAUT on PAYMST.",
        command: "WRKAUTL",
      },
    ],
  },
  {
    label: "Detect, respond & SQL",
    blurb: "Journal, jobs, and QSYS2 services — the evidence engineering path.",
    items: [
      {
        theme: "Audit journal",
        meta: "CLAIMS-005 · DSPJRN",
        checkboxGap: "SIEM correlation rules are not a substitute for journal rows.",
        grcProof: "QAUDJRN security events with timestamps and ENTTYP.",
        command: "DSPJRN JRN(QSYS/QAUDJRN)",
      },
      {
        theme: "Filtered journal entries",
        meta: "CLAIMS-005 · DSPAUDJRNE",
        checkboxGap: "Incident tickets without ENTTYP(AF) screenshots lack reproducibility.",
        grcProof: "Authority and password failures filtered at source.",
        command: "DSPAUDJRNE JRN(QSYS/QAUDJRN) ENTTYP(AF PW)",
      },
      {
        theme: "Active jobs",
        meta: "CLAIMS-005 · WRKACTJOB",
        checkboxGap: "Uptime dashboards hide batch jobs attributed to stale vendor IDs.",
        grcProof: "Live job table — interactive and QBATCH workload.",
        command: "WRKACTJOB",
      },
      {
        theme: "SQL services catalog",
        meta: "Evidence engineering · WRKSQLSVC",
        checkboxGap: "Framework templates do not return queryable USER_INFO rows.",
        grcProof: "24+ repeatable QSYS2 queries with live preview — MAIN menu 8.",
        command: "WRKSQLSVC",
      },
    ],
  },
  {
    label: "Mission workflow",
    blurb: "Commands that close the governance loop — use on mission screens, not here.",
    items: FEATURED_COMMAND_ARTICLES.map((row) => ({
      theme: row.command,
      meta: row.article.frameworkRefs?.join(" · ") ?? "i on GRC",
      checkboxGap: "Article proof without green-screen execution is narrative only.",
      grcProof: row.article.hook ?? row.article.title,
      command: row.command,
    })),
  },
];

export function buildCommandAtlasPanel(): EvidenceFocusPanel {
  const commandCount = ATLAS_GROUPS.reduce((sum, group) => sum + group.items.length, 0);
  return {
    kind: "atlas",
    headline: "GRC command atlas — evidence paths on IBM i",
    statsLine: `${commandCount} catalogued commands · grouped by control theme`,
    contrast: {
      checkbox: "Framework workbooks list control activities; they do not run CL on your partition.",
      queryable:
        "Each command below maps to a mission path and article — type it on ===> or use the AUDIT menu during investigations.",
    },
    lead: "HELP is reference tooling, not the mission loop. Copy commands to the green screen; return to AUDIT when you are ready to collect evidence or write findings.",
    article: {
      title: "Audit-Ready Is Not Decision-Ready",
      url: ARTICLE_URLS.DECISION_READY,
      hook: "The atlas connects framework language to commands you can run and cite.",
      frameworkRefs: ["Evidence engineering", "IBM i CL"],
    },
    categories: ATLAS_GROUPS,
  };
}

const PDM_ITEMS: EvidenceFocusItem[] = [
  {
    theme: "Program development manager",
    meta: "STRPDM · ITGC",
    checkboxGap: "Change tickets without source member references are incomplete ITGC evidence.",
    grcProof: "Classic path to libraries, objects, and source members on the partition.",
    command: "STRPDM LIB(CLAIMS400)",
  },
  {
    theme: "Source member browse",
    meta: "WRKMBRPDM · QCLSRC/NIGHTRUN",
    checkboxGap: "Screenshots of SEU do not prove which member was in production at review time.",
    grcProof: "Browse CL and RPG source — option 5 displays member text.",
    command: "WRKMBRPDM FILE(CLAIMS400/QCLSRC)",
  },
  {
    theme: "Display physical file member",
    meta: "DSPPFM · source artifact",
    checkboxGap: "Compile logs alone do not show the CL commands that touch payroll files.",
    grcProof: "Member source as an evidence artifact — NIGHTRUN, CLMMAINT paths.",
    command: "DSPPFM FILE(CLAIMS400/QCLSRC) MBR(NIGHTRUN)",
  },
  {
    theme: "RPG maintenance source",
    meta: "WRKMBRPDM · QRPGLESRC/CLMMAINT",
    checkboxGap: "Change impact reviews skip RPG members that touch production files.",
    grcProof: "Claims maintenance RPG — reads CLAIMMST on the partition.",
    command: "WRKMBRPDM FILE(CLAIMS400/QRPGLESRC)",
  },
  {
    theme: "Program references",
    meta: "DSPPGMREF · SoD",
    checkboxGap: "SoD matrices rarely list which files PAYAUTHR can read on IBM i.",
    grcProof: "Program-to-file cross-reference — PAYAUTHR → PAYROLL/PAYMST touch points.",
    command: "DSPPGMREF PGM(CLAIMS400/PAYAUTHR)",
  },
];

export function buildPdmEvidencePanel(screenId: ScreenId): EvidenceFocusPanel {
  const screenLead: Record<string, string> = {
    STRPDM: "PDM is the operator path to source-level ITGC evidence — libraries, members, and compile objects.",
    WRKMBRPDM: "Option 5 displays source without a full SEU session — cite member text in findings.",
    DSPPFM: "Physical file member display — evidence artifact for batch and CL change review.",
    DSPPGMREF: "Cross-reference programs to files — segregation-of-duties and data-touch proof.",
  };

  return {
    kind: "pdm",
    headline: "Evidence engineering — source & cross-reference",
    statsLine: `${PDM_ITEMS.length} PDM paths · ITGC / SoD on the green screen`,
    contrast: {
      checkbox: "CMDB exports and change tickets describe what should be in production.",
      queryable:
        "DSPPGMREF and source members on the partition show what programs actually reference PAYROLL data.",
    },
    lead: screenLead[screenId] ?? screenLead.STRPDM,
    article: {
      title: "Can You Prove IBM i Security?",
      url: MISSION_ARTICLES["CLAIMS-001"]?.url ?? ARTICLE_URLS.DECISION_READY,
      hook: "Source and cross-reference evidence complements profile and object authority reviews.",
      frameworkRefs: ["ITGC", "SoD", "PDM"],
    },
    categories: [
      {
        label: "PDM evidence paths",
        blurb: "Source-level proof for change management and SoD — not the mission checklist.",
        items: PDM_ITEMS,
      },
    ],
  };
}

const OPERATOR_ITEMS: Record<string, EvidenceFocusItem[]> = {
  DSPEVDDIFF: [
    {
      theme: "Profile mutation diff",
      meta: "DSPEVDDIFF TYPE(*USRPRF)",
      checkboxGap: "Before/after spreadsheets are not tied to the session that made the change.",
      grcProof: "Reviewable diff after CHGUSRPRF or privileged activity in this session.",
      command: "DSPEVDDIFF TYPE(*USRPRF)",
    },
    {
      theme: "Full session diff",
      meta: "DSPEVDDIFF TYPE(*ALL)",
      checkboxGap: "Change advisory boards want evidence, not assertions about what QSECOFR changed.",
      grcProof: "All recorded mutations in the privileged operator session.",
      command: "DSPEVDDIFF TYPE(*ALL)",
    },
    {
      theme: "Export privileged transcript",
      meta: "GENRPT TYPE(*PRIV)",
      checkboxGap: "Screen recordings are not reproducible command transcripts.",
      grcProof: "Export session commands for workpapers — pair with DSPEVDDIFF.",
      command: "GENRPT TYPE(*PRIV)",
    },
  ],
  DSPPRVSSN: [
    {
      theme: "Privileged session summary",
      meta: "DSPPRVSSN · QSECOFR lane",
      checkboxGap: "RBAC role names in IdP do not map to *ALLOBJ on IBM i.",
      grcProof: "Authorities, libraries, and session metadata for the signed-on security officer.",
      command: "DSPPRVSSN",
    },
    {
      theme: "Compare to auditor view",
      meta: "DSPUSRPRF · cross-lane",
      checkboxGap: "Auditors see profiles; operators must prove what this session can actually do.",
      grcProof: "Pair DSPPRVSSN with WRKUSRPRF evidence from the AUDIT lane.",
      command: "DSPUSRPRF USRPRF(QSECOFR)",
    },
    {
      theme: "Audit journal after changes",
      meta: "DSPJRN · CP rows",
      checkboxGap: "Privileged session logs off without journal CP evidence of what changed.",
      grcProof: "Journal change-profile rows after operator mutations.",
      command: "DSPJRN JRN(QSYS/QAUDJRN)",
    },
  ],
};

export function buildOperatorEvidencePanel(screenId: ScreenId): EvidenceFocusPanel {
  const items = OPERATOR_ITEMS[screenId] ?? OPERATOR_ITEMS.DSPEVDDIFF!;
  const headlines: Record<string, string> = {
    DSPEVDDIFF: "Evidence engineering — change detection",
    DSPPRVSSN: "Evidence engineering — privileged session",
  };

  return {
    kind: "operator",
    headline: headlines[screenId] ?? "Evidence engineering — operator",
    statsLine: `${items.length} operator evidence paths · QSECOFR lane`,
    contrast: {
      checkbox: "Privileged access policies describe who may change profiles.",
      queryable:
        "DSPEVDDIFF and GENRPT TYPE(*PRIV) produce reviewable artifacts from this session — not screenshots.",
    },
    lead:
      screenId === "DSPPRVSSN"
        ? "Sign-on Information display — what this QSECOFR session can do before you change production profiles."
        : "Compare before/after state after CHGUSRPRF or other privileged commands in this session.",
    categories: [
      {
        label: "Operator evidence",
        blurb: "Change detection and session proof — reference tooling, not the auditor mission loop.",
        items,
      },
    ],
  };
}
