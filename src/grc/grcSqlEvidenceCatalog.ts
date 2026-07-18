import { executeRunSql, type RunSqlResult } from "../ibmi-runtime/runSqlService.js";
import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { ARTICLE_URLS, type GrcArticleLink } from "./iOnGrcArticles.js";

export type SqlEvidenceCategoryId =
  | "access"
  | "privacy"
  | "detect"
  | "operations"
  | "perimeter";

export type GrcSqlEvidenceQuery = {
  id: string;
  category: SqlEvidenceCategoryId;
  serviceView: string;
  theme: string;
  grcProof: string;
  /** What checkbox / screenshot audits miss without a live query. */
  checkboxGap: string;
  sql: string;
  framework?: string;
};

export type Qsys2ServiceView = {
  viewName: string;
  description: string;
  sampleQueryId: string;
};

/** IBM i 7.4-style service catalog — matches WRKSQLSVC green-screen layout. */
export const QSYS2_SERVICE_VIEWS: Qsys2ServiceView[] = [
  { viewName: "QSYS2.USER_INFO", description: "User profile and special authority attributes", sampleQueryId: "profiles-all" },
  { viewName: "QSYS2.GROUP_PROFILE_ENTRIES", description: "Group and supplemental profile membership", sampleQueryId: "group-profiles" },
  { viewName: "QSYS2.SYSTEM_VALUE_INFO", description: "Security-relevant system values", sampleQueryId: "sysval-security-pack" },
  { viewName: "QSYS2.OBJECT_AUTHORITY", description: "Object authority and *PUBLIC grants", sampleQueryId: "objaut-paymst" },
  { viewName: "QSYS2.OBJECT_STATISTICS", description: "Object catalog and public authority", sampleQueryId: "obj-stats-sensitive" },
  { viewName: "QSYS2.DISPLAY_JOURNAL", description: "Audit journal entries (synthetic QAUDJRN)", sampleQueryId: "journal-af-pw" },
  { viewName: "QSYS2.ACTIVE_JOB_INFO", description: "Active and batch job attributes", sampleQueryId: "jobs-active" },
  { viewName: "QSYS2.JOBLOG_INFO", description: "Job log messages for interactive session", sampleQueryId: "joblog-session" },
  { viewName: "QSYS2.OUTPUT_QUEUE_ENTRIES", description: "Spooled file ownership and status", sampleQueryId: "spool-output" },
  { viewName: "QSYS2.IFS_OBJECT_PRIVILEGES", description: "IFS path data authority", sampleQueryId: "ifs-payroll" },
  { viewName: "QSYS2.LIBRARY_LIST_INFO", description: "Job library list scope", sampleQueryId: "library-list" },
  { viewName: "QSYS2.PTF_GROUP_CURRENCY", description: "PTF group currency", sampleQueryId: "ptf-currency" },
  { viewName: "QSYS2.LICENSE_INFO", description: "Licensed program inventory", sampleQueryId: "license-base" },
  { viewName: "QSYS2.NETSTAT_INFO", description: "Network listener endpoints", sampleQueryId: "netstat-listeners" },
];

export const SQL_EVIDENCE_CATEGORY_LABELS: Record<SqlEvidenceCategoryId, { label: string; blurb: string }> = {
  access: {
    label: "Access governance",
    blurb: "Profiles, groups, and system values — recertification and privileged scope.",
  },
  privacy: {
    label: "Privacy operations",
    blurb: "Object authority, IFS paths, and ownership — Clause 8 operational proof.",
  },
  detect: {
    label: "Detect & respond",
    blurb: "Journal, job log, and active jobs — incident timelines you can re-run.",
  },
  operations: {
    label: "IT operations",
    blurb: "Libraries, spool, PTF, and license — scope and change-management evidence.",
  },
  perimeter: {
    label: "Exposure",
    blurb: "Listeners and exportable rows for perimeter reviews.",
  },
};

/**
 * GRC evidence-engineering query pack — SQL uses IBM QSYS2 column names from
 * IBM i Services documentation (repeatable on a real partition via RUNSQL/STRSQL).
 */
export const GRC_SQL_EVIDENCE_QUERIES: GrcSqlEvidenceQuery[] = [
  {
    id: "profiles-all",
    category: "access",
    serviceView: "QSYS2.USER_INFO",
    theme: "Population · all profiles",
    grcProof: "Complete signed-on population for quarterly access review.",
    checkboxGap: "A user list screenshot is stale the moment someone signs on.",
    sql: "select authorization_name, status, special_authorities from qsys2.user_info",
    framework: "ISO 27001 A.9.2.5",
  },
  {
    id: "profiles-allobj",
    category: "access",
    serviceView: "QSYS2.USER_INFO",
    theme: "Privileged · *ALLOBJ direct",
    grcProof: "Direct *ALLOBJ holders — blast radius and recertification scope.",
    checkboxGap: "Framework templates do not show who actually has *ALLOBJ today.",
    sql: "select authorization_name, status, special_authorities from qsys2.user_info where special_authorities like '%*ALLOBJ%'",
    framework: "SOC 2 CC6.1",
  },
  {
    id: "profiles-allobj-group",
    category: "access",
    serviceView: "QSYS2.USER_INFO",
    theme: "Privileged · *ALLOBJ via group",
    grcProof: "IBM support pattern — *ALLOBJ inherited through group profiles.",
    checkboxGap: "Group inheritance is invisible on a WRKUSRPRF screenshot alone.",
    sql: `select authorization_name, status, special_authorities
from qsys2.user_info
where special_authorities like '%*ALLOBJ%'
   or authorization_name in (
     select user_profile_name from qsys2.group_profile_entries
     where group_profile_name in (
       select authorization_name from qsys2.user_info
       where special_authorities like '%*ALLOBJ%'))`,
    framework: "IBM ALLOBJ report pattern",
  },
  {
    id: "profile-payadmin",
    category: "privacy",
    serviceView: "QSYS2.USER_INFO",
    theme: "Privacy · PAYADMIN owner",
    grcProof: "Profile ownership — Clause 5 data-owner accountability.",
    checkboxGap: "DSPUSRPRF one-off does not scale across hundreds of payroll IDs.",
    sql: "select authorization_name, status, owner_profile from qsys2.user_info where authorization_name = 'PAYADMIN'",
    framework: "ISO 27701 Clause 5",
  },
  {
    id: "profile-oldvendor",
    category: "access",
    serviceView: "QSYS2.USER_INFO",
    theme: "TPRM · OLDVENDOR",
    grcProof: "Vendor profile still enabled after offboarding window.",
    checkboxGap: "Offboarding ticket closed ≠ profile disabled on the partition.",
    sql: "select authorization_name, status, special_authorities from qsys2.user_info where authorization_name = 'OLDVENDOR'",
    framework: "ISO 27001 A.9.2.6",
  },
  {
    id: "profile-backupadm",
    category: "access",
    serviceView: "QSYS2.USER_INFO",
    theme: "Privileged · BACKUPADM",
    grcProof: "Stale privileged backup operator with *SAVSYS.",
    checkboxGap: "Last sign-on on a slide deck is not queryable evidence.",
    sql: "select authorization_name, status, special_authorities from qsys2.user_info where authorization_name = 'BACKUPADM'",
    framework: "ITGC privileged access",
  },
  {
    id: "group-profiles",
    category: "access",
    serviceView: "QSYS2.GROUP_PROFILE_ENTRIES",
    theme: "Groups · membership",
    grcProof: "Group membership inheritance path for SoD review.",
    checkboxGap: "Group members change without updating the audit workbook.",
    sql: "select user_profile_name, group_profile_name from qsys2.group_profile_entries",
    framework: "ISO 27001 A.9.2.3",
  },
  {
    id: "sysval-qsecurity",
    category: "access",
    serviceView: "QSYS2.SYSTEM_VALUE_INFO",
    theme: "Baseline · QSECURITY",
    grcProof: "System value alone does not prove effective governance.",
    checkboxGap: "A policy PDF citing QSECURITY=40 is not live configuration proof.",
    sql: "select system_value_name, current_value from qsys2.system_value_info where system_value_name = 'QSECURITY'",
    framework: "ISO 27001 A.8.9",
  },
  {
    id: "sysval-security-pack",
    category: "access",
    serviceView: "QSYS2.SYSTEM_VALUE_INFO",
    theme: "Baseline · security trio",
    grcProof: "QSECURITY + QAUDCTL + QCRTAUT — monitoring and default auth.",
    checkboxGap: "Three separate DSPSYSVAL screenshots drift from exportable SQL.",
    sql: "select system_value_name, current_value from qsys2.system_value_info where system_value_name in ('QSECURITY', 'QAUDCTL', 'QCRTAUT')",
    framework: "SOC 2 CC6.6",
  },
  {
    id: "objaut-paymst",
    category: "privacy",
    serviceView: "QSYS2.OBJECT_AUTHORITY",
    theme: "SoD · PAYMST",
    grcProof: "Who can touch payroll master — segregation evidence.",
    checkboxGap: "One DSPOBJAUT capture does not prove who had access last quarter.",
    sql: "select authorization_name, object_authority from qsys2.object_authority where object_schema = 'PAYROLL' and object_name = 'PAYMST'",
    framework: "ISO 27701 Clause 8",
  },
  {
    id: "objaut-public",
    category: "privacy",
    serviceView: "QSYS2.OBJECT_AUTHORITY",
    theme: "Blast radius · *PUBLIC",
    grcProof: "*PUBLIC row on sensitive objects — exportable authority matrix.",
    checkboxGap: "Risk registers rarely include live *PUBLIC authority rows.",
    sql: "select authorization_name, object_authority, object_schema, object_name from qsys2.object_authority where object_name = 'PAYMST'",
    framework: "ISO 27001 A.8.3",
  },
  {
    id: "obj-stats-sensitive",
    category: "privacy",
    serviceView: "QSYS2.OBJECT_STATISTICS",
    theme: "Objects · catalog",
    grcProof: "Public authority on sensitive files across libraries.",
    checkboxGap: "Object inventories in Excel are not tied to partition state.",
    sql: "select object_library, object_name, object_type, public_authority from qsys2.object_statistics",
    framework: "ISO 27001 A.8.3",
  },
  {
    id: "journal-af-pw",
    category: "detect",
    serviceView: "QSYS2.DISPLAY_JOURNAL",
    theme: "Detect · AF/PW",
    grcProof: "Authority and password failures — incident timeline seed.",
    checkboxGap: "A SIEM slide does not replace journal rows with timestamps.",
    sql: "select entry_time, user_name, entry_type, message from qsys2.display_journal where entry_type in ('AF', 'PW')",
    framework: "SOC 2 CC7.2",
  },
  {
    id: "journal-cp",
    category: "detect",
    serviceView: "QSYS2.DISPLAY_JOURNAL",
    theme: "Change · CP",
    grcProof: "Profile change events — offboarding and privileged drift.",
    checkboxGap: "Change tickets without journal CP rows are assertion not evidence.",
    sql: "select entry_time, user_name, entry_type, message from qsys2.display_journal where entry_type in ('CP')",
    framework: "ISO 27001 A.9.2.6",
  },
  {
    id: "jobs-active",
    category: "detect",
    serviceView: "QSYS2.ACTIVE_JOB_INFO",
    theme: "Ops · active jobs",
    grcProof: "Batch vs interactive — spot vendor or backup workload.",
    checkboxGap: "WRKACTJOB snapshot ≠ repeatable query for the audit period.",
    sql: "select job_name, job_user, job_number, subsystem, job_status from qsys2.active_job_info",
    framework: "Blue team detect",
  },
  {
    id: "jobs-batch",
    category: "detect",
    serviceView: "QSYS2.ACTIVE_JOB_INFO",
    theme: "Ops · QBATCH jobs",
    grcProof: "Filter batch subsystem — vendor job activity.",
    checkboxGap: "Checkbox audits rarely capture live batch job attribution.",
    sql: "select job_name, job_user, job_number, job_status from qsys2.active_job_info where subsystem = 'QBATCH'",
    framework: "CLAIMS-005 pattern",
  },
  {
    id: "joblog-session",
    category: "detect",
    serviceView: "QSYS2.JOBLOG_INFO",
    theme: "Respond · job log",
    grcProof: "Command trace for the signed-on investigator session.",
    checkboxGap: "Analyst notes are not a substitute for job log message IDs.",
    sql: "select message_id, message_text from qsys2.joblog_info",
    framework: "Incident response",
  },
  {
    id: "spool-output",
    category: "operations",
    serviceView: "QSYS2.OUTPUT_QUEUE_ENTRIES",
    theme: "Output · spool",
    grcProof: "Sensitive report ownership and output queue exposure.",
    checkboxGap: "Output queue screenshots omit sortable owner columns.",
    sql: "select spooled_file_name, user_name, spool_number, status from qsys2.output_queue_entries",
    framework: "ISO 27001 A.8.12",
  },
  {
    id: "ifs-payroll",
    category: "privacy",
    serviceView: "QSYS2.IFS_OBJECT_PRIVILEGES",
    theme: "Privacy · IFS",
    grcProof: "IFS path authority beside DB2 object auth.",
    checkboxGap: "Privacy assessments often skip IFS beside PAYROLL files.",
    sql: "select path_name, object_type, data_authority from qsys2.ifs_object_privileges",
    framework: "ISO 27701 Clause 8",
  },
  {
    id: "library-list",
    category: "operations",
    serviceView: "QSYS2.LIBRARY_LIST_INFO",
    theme: "Scope · libraries",
    grcProof: "Library list scope — where evidence objects live.",
    checkboxGap: "Scope diagrams rarely match the job's live library list.",
    sql: "select schema_name, library_type from qsys2.library_list_info",
    framework: "Scope definition",
  },
  {
    id: "ptf-currency",
    category: "operations",
    serviceView: "QSYS2.PTF_GROUP_CURRENCY",
    theme: "Patch · PTF",
    grcProof: "Patch currency for change-management ITGC.",
    checkboxGap: "Change advisory PDFs are not machine-queryable currency proof.",
    sql: "select ptf_group, status, level from qsys2.ptf_group_currency",
    framework: "SOC 2 CC8.1",
  },
  {
    id: "netstat-listeners",
    category: "perimeter",
    serviceView: "QSYS2.NETSTAT_INFO",
    theme: "Perimeter · ports",
    grcProof: "Listener endpoints — TN5250 and HTTP attack surface.",
    checkboxGap: "Firewall diagrams do not prove what the partition is listening on.",
    sql: "select local_address, local_port, state, service from qsys2.netstat_info",
    framework: "Network exposure",
  },
  {
    id: "license-base",
    category: "operations",
    serviceView: "QSYS2.LICENSE_INFO",
    theme: "Asset · license",
    grcProof: "Partition license row for asset inventory.",
    checkboxGap: "Asset spreadsheets diverge from QSYS2.LICENSE_INFO quickly.",
    sql: "select product_id, feature, expiration from qsys2.license_info",
    framework: "Asset management",
  },
];

export function listGrcSqlEvidenceQueries(): GrcSqlEvidenceQuery[] {
  return GRC_SQL_EVIDENCE_QUERIES;
}

export function listQsys2ServiceViews(): Qsys2ServiceView[] {
  return QSYS2_SERVICE_VIEWS;
}

export function getGrcSqlEvidenceQuery(id: string): GrcSqlEvidenceQuery | undefined {
  return GRC_SQL_EVIDENCE_QUERIES.find((query) => query.id === id);
}

export function getGrcSqlEvidenceQueryByIndex(index: number): GrcSqlEvidenceQuery | undefined {
  return GRC_SQL_EVIDENCE_QUERIES[index];
}

export function getSampleQueryForService(service: Qsys2ServiceView): GrcSqlEvidenceQuery | undefined {
  return getGrcSqlEvidenceQuery(service.sampleQueryId);
}

export function buildRunSqlCommand(sql: string): string {
  const escaped = sql.replace(/'/g, "''");
  return `RUNSQL SQL('${escaped.replace(/\s+/g, " ").trim()}')`;
}

export function buildSqlServiceMenuSelections(): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < Math.min(9, QSYS2_SERVICE_VIEWS.length); i += 1) {
    const sample = getSampleQueryForService(QSYS2_SERVICE_VIEWS[i]!);
    if (sample) map[String(i + 1)] = buildRunSqlCommand(sample.sql);
  }
  return map;
}

export type SqlEvidencePreview = {
  id: string;
  category: SqlEvidenceCategoryId;
  categoryLabel: string;
  serviceView: string;
  theme: string;
  grcProof: string;
  checkboxGap: string;
  sql: string;
  framework?: string;
  runCommand: string;
  columns: string[];
  rows: string[][];
  rowCount: number;
  truncated: boolean;
  message?: string;
};

export type SqlEvidenceEngineeringPanel = {
  headline: string;
  contrast: { checkbox: string; queryable: string };
  article: GrcArticleLink;
  stats: { queryCount: number; viewCount: number; liveSource: string };
  categories: Array<{
    id: SqlEvidenceCategoryId;
    label: string;
    blurb: string;
    queries: SqlEvidencePreview[];
  }>;
};

const PREVIEW_MAX_ROWS = 3;
const PREVIEW_MAX_COLS = 4;
const PREVIEW_CELL_LEN = 20;

function truncateCell(value: string): string {
  const text = value ?? "";
  return text.length > PREVIEW_CELL_LEN ? `${text.slice(0, PREVIEW_CELL_LEN - 1)}…` : text;
}

export function previewSqlEvidence(
  systemName: string,
  query: GrcSqlEvidenceQuery,
  session?: IbmiSession,
  maxRows = PREVIEW_MAX_ROWS,
): SqlEvidencePreview {
  const result: RunSqlResult = executeRunSql(systemName, query.sql, session);
  const categoryMeta = SQL_EVIDENCE_CATEGORY_LABELS[query.category];
  const columns = result.columns.slice(0, PREVIEW_MAX_COLS);
  const rows = result.rows.slice(0, maxRows).map((row) =>
    row.slice(0, PREVIEW_MAX_COLS).map((cell) => truncateCell(cell)),
  );
  return {
    id: query.id,
    category: query.category,
    categoryLabel: categoryMeta.label,
    serviceView: query.serviceView,
    theme: query.theme,
    grcProof: query.grcProof,
    checkboxGap: query.checkboxGap,
    sql: query.sql,
    framework: query.framework,
    runCommand: buildRunSqlCommand(query.sql),
    columns,
    rows,
    rowCount: result.rowCount ?? result.rows.length,
    truncated: (result.rowCount ?? result.rows.length) > maxRows,
    message: result.message,
  };
}

export function buildSqlEvidenceEngineeringPanel(
  systemName: string,
  session?: IbmiSession,
): SqlEvidenceEngineeringPanel {
  const previews = GRC_SQL_EVIDENCE_QUERIES.map((query) =>
    previewSqlEvidence(systemName, query, session),
  );
  const categories = (Object.keys(SQL_EVIDENCE_CATEGORY_LABELS) as SqlEvidenceCategoryId[]).map((id) => ({
    id,
    label: SQL_EVIDENCE_CATEGORY_LABELS[id].label,
    blurb: SQL_EVIDENCE_CATEGORY_LABELS[id].blurb,
    queries: previews.filter((preview) => preview.category === id),
  }));

  return {
    headline: "Evidence engineering — query the partition, not the checklist",
    contrast: {
      checkbox: "Screenshot compliance captures a moment. Workbooks go stale. Templates assert controls.",
      queryable:
        "QSYS2 SQL services return live rows from this partition's SQLite state — repeatable, exportable, citable in findings.",
    },
    article: {
      title: "Audit-Ready Is Not Decision-Ready",
      url: ARTICLE_URLS.DECISION_READY,
      hook: "Tabular IBM i Services evidence is the bridge from framework language to decision-ready findings.",
      frameworkRefs: ["Evidence engineering", "QSYS2", "RUNSQL"],
    },
    stats: {
      queryCount: GRC_SQL_EVIDENCE_QUERIES.length,
      viewCount: QSYS2_SERVICE_VIEWS.length,
      liveSource: `${systemName} · scenario SQLite`,
    },
    categories,
  };
}

/** @deprecated Use buildSqlEvidenceEngineeringPanel */
export function buildSqlEvidencePanel(
  systemName: string,
  session?: IbmiSession,
): SqlEvidencePreview[] {
  return GRC_SQL_EVIDENCE_QUERIES.map((query) => previewSqlEvidence(systemName, query, session));
}
