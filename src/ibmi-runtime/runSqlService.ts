import { listAuditJournalEntries } from "./auditJournalService.js";
import { listIfsLinks } from "./ifsLinkService.js";
import { listAllJobs } from "./jobService.js";
import { getJobLog } from "./jobLogService.js";
import { listCatalogObjects } from "./objectCatalogService.js";
import { listObjectAuthorities } from "../db/repositories/objectAuthorityRepository.js";
import { getObject as getObjectRow } from "../db/repositories/objectRepository.js";
import { listSpooledFiles } from "./spoolService.js";
import { listSecuritySystemValues } from "./systemValueService.js";
import { listUserProfiles } from "./userProfileService.js";
import type { IbmiSession } from "./sessionService.js";
import { displayLibraryList } from "./libraryListService.js";
import { listOutfileRows, resolveOutfileQuery, resolveOutfileLocation } from "./outfileService.js";

export type RunSqlResult = {
  columns: string[];
  rows: string[][];
  rowCount?: number;
  message?: string;
};

function withRowCount(result: Omit<RunSqlResult, "rowCount">): RunSqlResult {
  return { ...result, rowCount: result.rows.length };
}

function profileOwner(userName: string): string {
  if (userName === "PAYADMIN") return "*NONE";
  if (userName === "BACKUPADM") return "ITOPS";
  if (userName === "OLDVENDOR" || userName === "QPGMR") return "*NONE";
  return "QSECOFR";
}

function filterProfilesByName(
  profiles: ReturnType<typeof listUserProfiles>,
  normalized: string,
): ReturnType<typeof listUserProfiles> {
  const authMatch = normalized.match(/authorization_name\s*=\s*'([^']+)'/i);
  const userMatch = normalized.match(/user_name\s*=\s*'([^']+)'/i);
  const name = (authMatch?.[1] ?? userMatch?.[1])?.toUpperCase();
  if (name) return profiles.filter((profile) => profile.userName === name);
  return profiles;
}

export function executeRunSql(systemName: string, rawSql: string, session?: IbmiSession): RunSqlResult {
  const sql = rawSql.trim().replace(/;\s*$/i, "");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  if (!/^select\s+/i.test(sql)) {
    return { columns: [], rows: [], rowCount: 0, message: "SQL0104 - Token SELECT was not valid." };
  }

  if (normalized.includes("from qsys2.user_info")) {
    let profiles = listUserProfiles(systemName);

    if (normalized.includes("group_profile_entries") && normalized.includes("*allobj")) {
      const direct = profiles.filter((profile) => profile.specialAuthorities.includes("*ALLOBJ"));
      const groupNames = new Set(direct.map((profile) => profile.userName));
      const inherited = profiles.filter(
        (profile) => profile.groupProfile !== "*NONE" && groupNames.has(profile.groupProfile),
      );
      const seen = new Set<string>();
      profiles = [...direct, ...inherited].filter((profile) => {
        if (seen.has(profile.userName)) return false;
        seen.add(profile.userName);
        return true;
      });
    } else if (normalized.includes("like '%*allobj%'")) {
      profiles = profiles.filter((profile) => profile.specialAuthorities.includes("*ALLOBJ"));
    } else {
      profiles = filterProfilesByName(profiles, normalized);
    }

    if (normalized.includes("subsystem = 'qbatch'")) {
      return withRowCount({ columns: [], rows: [], message: "SQL0204 - Column SUBSYSTEM not valid for USER_INFO." });
    }

    return withRowCount({
      columns: ["AUTHORIZATION_NAME", "STATUS", "SPECIAL_AUTHORITIES", "GROUP_PROFILE_NAME", "OWNER_PROFILE"],
      rows: profiles.map((profile) => [
        profile.userName,
        profile.status,
        profile.specialAuthorities,
        profile.groupProfile,
        profileOwner(profile.userName),
      ]),
    });
  }

  if (normalized.includes("from qsys2.system_value_info")) {
    let values = listSecuritySystemValues(systemName);
    const inMatch = normalized.match(/system_value_name in \(([^)]+)\)/i);
    if (inMatch?.[1]) {
      const names = inMatch[1].split(",").map((part) => part.replace(/'/g, "").trim().toUpperCase());
      values = values.filter((value) => names.includes(value.name));
    }
    const nameMatch = normalized.match(/system_value_name\s*=\s*'([^']+)'/i);
    if (nameMatch?.[1]) {
      values = values.filter((value) => value.name === nameMatch[1]!.toUpperCase());
    }
    return withRowCount({
      columns: ["SYSTEM_VALUE_NAME", "CURRENT_VALUE", "DESCRIPTION"],
      rows: values.map((value) => [value.name, value.value, value.description]),
    });
  }

  if (
    normalized.includes("from qsys2.object_authority") ||
    normalized.includes("from qsys2.object_privileges")
  ) {
    const objectMatch = normalized.match(/object_name\s*=\s*'([^']+)'/i);
    const schemaMatch = normalized.match(/object_schema\s*=\s*'([^']+)'/i);
    const objectName = objectMatch?.[1]?.toUpperCase() ?? "PAYMST";
    const library =
      schemaMatch?.[1]?.toUpperCase() ??
      (normalized.includes("payroll") || objectName === "PAYMST" ? "PAYROLL" : "CLAIMS400");
    const grants = listObjectAuthorities(systemName, library, objectName);
    const objectRow = getObjectRow(systemName, library, objectName);
    const rows = grants.map((grant) => [grant.userName, grant.authority, "*NONE", library, objectName]);
    if (objectRow?.publicAuth) {
      rows.unshift(["*PUBLIC", objectRow.publicAuth, "*NONE", library, objectName]);
    }
    return withRowCount({
      columns: ["AUTHORIZATION_NAME", "OBJECT_AUTHORITY", "DATA_AUTHORITY", "OBJECT_SCHEMA", "OBJECT_NAME"],
      rows,
    });
  }

  if (normalized.includes("from qsys2.object_statistics")) {
    const objects = listCatalogObjects(systemName);
    return withRowCount({
      columns: ["OBJECT_LIBRARY", "OBJECT_NAME", "OBJECT_TYPE", "PUBLIC_AUTHORITY"],
      rows: objects.map((object) => [
        object.library,
        object.object,
        object.type,
        object.publicAuth ?? "",
      ]),
    });
  }

  if (normalized.includes("from qsys2.group_profile_entries")) {
    const profiles = listUserProfiles(systemName).filter((profile) => profile.groupProfile !== "*NONE");
    return withRowCount({
      columns: ["USER_PROFILE_NAME", "GROUP_PROFILE_NAME"],
      rows: profiles.map((profile) => [profile.userName, profile.groupProfile]),
    });
  }

  if (
    normalized.includes("from qsys2.audit_journal_info") ||
    normalized.includes("from qsys2.display_journal")
  ) {
    let entries = listAuditJournalEntries(systemName);
    const typeMatch = normalized.match(/entry_type in \(([^)]+)\)/i);
    if (typeMatch?.[1]) {
      const types = typeMatch[1].split(",").map((part) => part.replace(/'/g, "").trim().toUpperCase());
      entries = entries.filter((entry) => types.includes(entry.entryType.toUpperCase()));
    }
    return withRowCount({
      columns: ["ENTRY_TIME", "USER_NAME", "ENTRY_TYPE", "MESSAGE"],
      rows: entries.map((entry) => [
        entry.entryTime,
        entry.userName,
        entry.entryType,
        entry.message ?? "",
      ]),
    });
  }

  if (normalized.includes("from qsys2.library_list_info") && session) {
    const list = displayLibraryList(session);
    return withRowCount({
      columns: ["SCHEMA_NAME", "LIBRARY_TYPE"],
      rows: [
        ...list.system.map((name) => [name, "SYSTEM"]),
        ...list.product.map((name) => [name, "PRODUCT"]),
        ...list.user.map((name) => [name, "USER"]),
      ],
    });
  }

  if (normalized.includes("from qsys2.active_job_info")) {
    let jobs = listAllJobs(systemName);
    if (normalized.includes("subsystem = 'qbatch'")) {
      jobs = jobs.filter((job) => job.subsystem.toUpperCase() === "QBATCH");
    }
    const selectPart = normalized.split(" from ")[0] ?? "";
    const includeSubsystem = selectPart.includes("subsystem");
    const columns = includeSubsystem
      ? ["JOB_NAME", "JOB_USER", "JOB_NUMBER", "SUBSYSTEM", "JOB_STATUS"]
      : ["JOB_NAME", "JOB_USER", "JOB_NUMBER", "JOB_STATUS"];
    return withRowCount({
      columns,
      rows: jobs.map((job) =>
        includeSubsystem
          ? [job.jobName, job.userName, job.jobNumber, job.subsystem, job.status]
          : [job.jobName, job.userName, job.jobNumber, job.status],
      ),
    });
  }

  if (normalized.includes("from qsys2.joblog_info")) {
    const lines = getJobLog(systemName, undefined, session?.userName);
    return withRowCount({
      columns: ["MESSAGE_ID", "MESSAGE_TEXT"],
      rows: lines.map((line) => {
        const match = line.match(/^([A-Z0-9]+)\s+-\s+(.+)$/);
        return match ? [match[1]!, match[2]!] : ["CPF9898", line];
      }),
    });
  }

  if (normalized.includes("from qsys2.output_queue_entries")) {
    const files = listSpooledFiles(systemName);
    return withRowCount({
      columns: ["SPOOLED_FILE_NAME", "USER_NAME", "SPOOL_NUMBER", "STATUS"],
      rows: files.map((file) => [file.fileName, file.userName, file.spoolNumber, file.status]),
    });
  }

  if (normalized.includes("from qsys2.ifs_object_privileges")) {
    const links = listIfsLinks(systemName, "/");
    return withRowCount({
      columns: ["PATH_NAME", "OBJECT_TYPE", "DATA_AUTHORITY"],
      rows: links.map((link) => [
        `${link.directory}/${link.name}`,
        link.linkType,
        link.dataAuthority ?? "*RWX",
      ]),
    });
  }

  if (normalized.includes("from qsys2.ptf_group_currency")) {
    return withRowCount({
      columns: ["PTF_GROUP", "STATUS", "LEVEL"],
      rows: [
        ["SF99704", "INSTALLED", "LATEST"],
        ["SF99703", "INSTALLED", "LATEST"],
        ["SF99662", "SUPERSEDED", "2024-03"],
      ],
    });
  }

  if (normalized.includes("from qsys2.license_info")) {
    return withRowCount({
      columns: ["PRODUCT_ID", "FEATURE", "EXPIRATION"],
      rows: [["5770-SS1", "*BASE", "*NONE"]],
    });
  }

  if (normalized.includes("from qsys2.netstat_info")) {
    return withRowCount({
      columns: ["LOCAL_ADDRESS", "LOCAL_PORT", "STATE", "SERVICE"],
      rows: [
        ["*ALL", "8023", "LISTEN", "TN5250"],
        ["*ALL", "6080", "LISTEN", "WEBSOCKIFY"],
        ["*ALL", "8080", "LISTEN", "HTTP"],
      ],
    });
  }

  if (normalized.includes("from qsys2.outfile_export")) {
    const nameMatch = normalized.match(/outfile_name\s*=\s*'([^']+)'/i);
    const memberMatch = normalized.match(/member_name\s*=\s*'([^']+)'/i);
    const rawOutfile = nameMatch?.[1]?.toUpperCase() ?? "QGPL/USERS";
    const { location, rows: stored } = resolveOutfileQuery(
      systemName,
      rawOutfile,
      memberMatch?.[1],
    );
    const selectPart = normalized.split(" from ")[0] ?? "";
    const columnMap: Record<string, string> = {
      user_name: "USER_NAME",
      status: "STATUS",
      user_class: "USER_CLASS",
      group_profile: "GROUP_PROFILE",
      special_authorities: "SPECIAL_AUTHORITIES",
      last_signon: "LAST_SIGNON",
      limit_capabilities: "LIMIT_CAPABILITIES",
      entry_time: "ENTRY_TIME",
      entry_type: "ENTRY_TYPE",
      object_ref: "OBJECT_REF",
      message: "MESSAGE",
      outfile_name: "OUTFILE_NAME",
      member_name: "MEMBER_NAME",
      row_index: "ROW_INDEX",
    };
    const requested = [...selectPart.matchAll(/\b([a-z_]+)\b/gi)]
      .map((match) => match[1]!.toLowerCase())
      .filter((name) => name !== "select" && columnMap[name]);
    const columns =
      requested.length > 0
        ? requested.map((name) => columnMap[name]!.toUpperCase())
        : stored[0]
          ? Object.keys(stored[0].columns).map((key) => key.toUpperCase())
          : ["OUTFILE_NAME", "MEMBER_NAME", "ROW_INDEX"];
    const qualified = `${location.library}/${location.fileName}`;
    return withRowCount({
      columns,
      rows: stored.map((row) =>
        columns.map((column) => {
          const key = column.toUpperCase();
          if (key === "OUTFILE_NAME") return qualified;
          if (key === "MEMBER_NAME") return location.memberName;
          if (key === "ROW_INDEX") return String(row.rowIndex);
          return row.columns[key] ?? row.columns[key.toLowerCase()] ?? "";
        }),
      ),
    });
  }

  return {
    columns: [],
    rows: [],
    rowCount: 0,
    message: "SQL0204 - Qualified view not supported in this lab RUNSQL subset.",
  };
}
