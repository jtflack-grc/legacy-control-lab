import type { ParsedCommand } from "../ibmi-runtime/commandParser.js";
import { getParameter, getQualifiedObject } from "../ibmi-runtime/commandParser.js";

export type EvidenceTag =
  | "privileged_access"
  | "special_authority"
  | "stale_profile"
  | "public_authority"
  | "system_value"
  | "audit_coverage"
  | "authority_failure"
  | "job_activity"
  | "spool_output"
  | "source_reference"
  | "ptf_currency"
  | "ifs_exposure"
  | "netserver_exposure";

function resolveEvidenceTagsByCategory(
  commandName: string,
  parsed: ParsedCommand,
  category: string,
): EvidenceTag[] {
  const tags = new Set<EvidenceTag>();
  const upper = commandName.toUpperCase();

  if (category === "user_profile" || upper.includes("USR")) tags.add("privileged_access");
  if (category === "system_value" || upper.includes("SYSVAL")) tags.add("system_value");
  if (category === "authority" || category === "library_object" || upper.includes("AUT") || upper.includes("OBJ")) {
    tags.add("public_authority");
  }
  if (category === "journal_audit" || upper.includes("JRN") || upper.includes("AUD")) {
    tags.add("audit_coverage");
    tags.add("authority_failure");
  }
  if (category === "job_batch" || upper.includes("JOB") || upper.includes("SBS")) tags.add("job_activity");
  if (category === "spool_print" || upper.includes("SPL") || upper.includes("OUTQ")) tags.add("spool_output");
  if (category === "message_queue" || upper.includes("MSG")) tags.add("authority_failure");
  if (category === "ifs" || upper.includes("LNK")) tags.add("ifs_exposure");
  if (category === "network_tcpip" || upper.includes("NET") || upper.includes("TCP")) tags.add("netserver_exposure");
  if (category === "source_pdm" || upper.includes("PGM") || upper.includes("SRC")) tags.add("source_reference");
  if (category === "ptf_license" || upper.includes("PTF") || upper.includes("LIC")) tags.add("ptf_currency");

  const user = getParameter(parsed, "USRPRF")?.toUpperCase();
  if (user === "BACKUPADM" || user === "OLDVENDOR" || user === "QPGMR") tags.add("special_authority");

  return [...tags];
}

export function resolveEvidenceTags(
  commandName: string,
  parsed: ParsedCommand,
  category?: string,
): EvidenceTag[] {
  const tags = new Set<EvidenceTag>();
  const name = commandName.toUpperCase();
  const user = getParameter(parsed, "USRPRF")?.toUpperCase();
  const qualified = getQualifiedObject(parsed, "OBJ") ?? getQualifiedObject(parsed, "FILE");

  switch (name) {
    case "DSPUSRPRF":
    case "WRKUSRPRF":
      tags.add("privileged_access");
      if (user === "BACKUPADM" || user === "OLDVENDOR" || user === "QPGMR") {
        tags.add("special_authority");
      }
      if (user === "BACKUPADM" || user === "OLDVENDOR") tags.add("stale_profile");
      break;
    case "ANZPRFACT":
      tags.add("privileged_access");
      tags.add("stale_profile");
      break;
    case "CHGACTPRFL":
      tags.add("privileged_access");
      break;
    case "CHGUSRPRF":
      tags.add("privileged_access");
      if (getParameter(parsed, "STATUS") === "*DISABLED") tags.add("stale_profile");
      break;
    case "DSPOBJAUT":
    case "EDTOBJAUT":
    case "GRTOBJAUT":
      tags.add("public_authority");
      if (qualified?.object === "PAYMST") tags.add("privileged_access");
      break;
    case "DSPSYSVAL":
    case "WRKSYSVAL":
    case "CHGSYSVAL":
      tags.add("system_value");
      break;
    case "DSPJRN":
    case "DSPAUDJRNE":
    case "DSPSECAUD":
      tags.add("audit_coverage");
      tags.add("authority_failure");
      break;
    case "DSPJOB":
    case "DSPJOBLOG":
    case "WRKACTJOB":
    case "WRKSBMJOB":
    case "WRKSBS":
      tags.add("job_activity");
      break;
    case "WRKSPLF":
    case "DSPSPLF":
    case "WRKOUTQ":
      tags.add("spool_output");
      break;
    case "STRPDM":
    case "WRKOBJPDM":
    case "WRKMBRPDM":
    case "DSPPFM":
    case "DSPPGM":
    case "DSPPGMREF":
      tags.add("source_reference");
      break;
    case "DSPPTF":
    case "WRKPTFGRP":
    case "WRKLICINF":
      tags.add("ptf_currency");
      break;
    case "WRKLNK":
    case "DSPLNK":
      tags.add("ifs_exposure");
      break;
    case "DSPMSG":
    case "WRKMSGQ":
      tags.add("authority_failure");
      break;
    case "RUNSQL": {
      const sql = (getParameter(parsed, "SQL") ?? "").toLowerCase();
      if (sql.includes("user_info")) tags.add("privileged_access");
      if (sql.includes("object_authority")) tags.add("public_authority");
      if (sql.includes("audit_journal") || sql.includes("display_journal")) tags.add("audit_coverage");
      if (sql.includes("active_job")) tags.add("job_activity");
      if (sql.includes("output_queue")) tags.add("spool_output");
      break;
    }
    default:
      break;
  }

  if (tags.size === 0 && category) {
    return resolveEvidenceTagsByCategory(commandName, parsed, category);
  }

  return [...tags];
}
