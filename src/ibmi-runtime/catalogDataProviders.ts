import type { IbmiSession } from "./sessionService.js";
import { listCatalogObjects, getCatalogObject } from "./objectCatalogService.js";
import { getLibraryListSections } from "./libraryListService.js";
import {
  listActiveJobs,
  listSubmittedJobs,
  listJobQueueEntries,
  listJobsBySubsystem,
  listJobsByUser,
} from "./jobService.js";
import { listSubsystems } from "./subsystemService.js";
import { listSpooledFiles } from "./spoolService.js";
import { getMessages } from "./messageService.js";
import { loadFullCommandCatalog } from "../catalog/commandCatalogService.js";
import { listLibrariesForWork } from "./libraryAdminService.js";
import { listLinkServers } from "./networkService.js";
import type { CatalogCommandDefinition } from "../catalog/commandTypes.js";
import { listUserProfiles } from "./userProfileService.js";
import { listSecuritySystemValues } from "./systemValueService.js";
import { listAuthorityFindings } from "./authorityService.js";
import { listPhysicalFiles } from "./physicalFileService.js";
import { getIfsLinkCatalog } from "./ifsLinkService.js";
import { listSourceMembers, listProgramReferences } from "./sourceMemberService.js";
import { listAuditJournalEntries } from "./auditJournalService.js";
import { listCatalogLabEntities } from "../db/repositories/catalogLabRepository.js";
import { listDiskUnits } from "./systemMonitorService.js";

export type CatalogListRow = {
  line: string;
  drillDown?: { command: string; input: string };
};

function rowsFromLabEntities(
  systemName: string,
  entityType: string,
  drillCommand: string,
  drillParam: string,
): CatalogListRow[] {
  return listCatalogLabEntities(systemName, entityType).slice(0, 10).map((entity) => ({
    line: `${entity.entityId.padEnd(20)} ${String(entity.state.status ?? "*ACTIVE").padEnd(10)} ${entity.entityType}`,
    drillDown: { command: drillCommand, input: `${drillCommand} ${drillParam}(${entity.entityId})` },
  }));
}

export function listRowsForCatalogCommand(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
): CatalogListRow[] {
  const system = session.systemName;
  const category = definition.category;
  const name = definition.name.toUpperCase();

  switch (category) {
    case "user_profile": {
      if (name.includes("JOBD")) {
        return [
          { line: "QBATCH/QDFTJOBD   Batch default job description", drillDown: { command: "DSPJOBD", input: "DSPJOBD JOBD(QBATCH/QDFTJOBD)" } },
          { line: "QGPL/TRAINER01    Trainer job description", drillDown: { command: "DSPJOBD", input: "DSPJOBD JOBD(QGPL/TRAINER01)" } },
        ];
      }
      if (name.includes("USRCLS")) {
        return [
          { line: "*USER       End user", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*USER)" } },
          { line: "*PGMR       Programmer", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*PGMR)" } },
          { line: "*SECOFR     Security officer", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*SECOFR)" } },
        ];
      }
      if (name.includes("USRGRP")) {
        return [{ line: "AUDITORS    Audit team group", drillDown: { command: "DSPUSRGRP", input: "DSPUSRGRP GRP(AUDITORS)" } }];
      }
      return listUserProfiles(system).slice(0, 12).map((profile) => ({
        line: `${profile.userName.padEnd(12)} ${profile.status.padEnd(10)} ${profile.userClass.padEnd(8)} ${profile.text.slice(0, 28)}`,
        drillDown: { command: "DSPUSRPRF", input: `DSPUSRPRF USRPRF(${profile.userName})` },
      }));
    }

    case "system_value":
      return listSecuritySystemValues(system).map((sysval) => ({
        line: `${sysval.name.padEnd(14)} ${sysval.value.padEnd(12)} ${sysval.description.slice(0, 36)}`,
        drillDown: { command: "DSPSYSVAL", input: `DSPSYSVAL SYSVAL(${sysval.name})` },
      }));

    case "authority": {
      const findings = listAuthorityFindings(system);
      if (findings.length > 0) {
        return findings.slice(0, 10).map((entry) => ({
          line: `${entry.library}/${entry.object}  ${entry.publicAuthority.padEnd(10)} ${entry.issue.slice(0, 28)}`,
          drillDown: { command: "DSPOBJAUT", input: `DSPOBJAUT OBJ(${entry.library}/${entry.object})` },
        }));
      }
      return listCatalogObjects(system).slice(0, 10).map((obj) => ({
        line: `${obj.library}/${obj.object}  ${obj.publicAuth.padEnd(10)} ${obj.type}`,
        drillDown: { command: "DSPOBJAUT", input: `DSPOBJAUT OBJ(${obj.library}/${obj.object})` },
      }));
    }

    case "security":
      return listAuditJournalEntries(system).slice(0, 10).map((entry) => ({
        line: `${entry.entryTime.slice(0, 19)} ${entry.entryType.padEnd(4)} ${entry.userName.padEnd(10)} ${(entry.message ?? entry.objectRef).slice(0, 28)}`,
        drillDown: { command: "DSPAUDJRNE", input: `DSPAUDJRNE ENTTYP(${entry.entryType})` },
      }));

    case "journal_audit": {
      const labJournals = rowsFromLabEntities(system, "journal", "DSPJRN", "JRN");
      if (labJournals.length > 0) return labJournals;
      return [
        {
          line: "QSYS/QAUDJRN   Security audit journal",
          drillDown: { command: "DSPJRN", input: "DSPJRN JRN(QSYS/QAUDJRN)" },
        },
        { line: "QAUDJRN   *ACTIVE   Receiver QAUDJRN0001" },
        { line: "ENTRIES   1,284     Last entry recent" },
      ];
    }

    case "message_queue": {
      const labQueues = rowsFromLabEntities(system, "message_queue", "DSPMSGQ", "MSGQ");
      if (labQueues.length > 0) return labQueues;
      return getMessages("QSYSOPR", session).slice(0, 10).map((msg) => ({
        line: `${msg.id.padEnd(7)} ${msg.severity.padEnd(8)} ${msg.text.slice(0, 48)}`,
        drillDown: { command: "DSPMSGD", input: `DSPMSGD MSGID(${msg.messageId})` },
      }));
    }

    case "network_tcpip":
      return listLinkServers().map((server) => ({
        line: `${server.name.padEnd(14)} ${server.status.padEnd(12)} ${server.port.padEnd(5)} ${server.description.slice(0, 28)}`,
        drillDown: { command: "DSPLNKSVR", input: `DSPLNKSVR SERVER(${server.name})` },
      }));

    case "database_file": {
      const physical = listPhysicalFiles(system);
      if (physical.length > 0) {
        return physical.slice(0, 10).map((file) => ({
          line: `${file.library}/${file.name}  ${file.fileType.padEnd(6)} ${file.textDescription.slice(0, 30)}`,
          drillDown: { command: "DSPFD", input: `DSPFD FILE(${file.library}/${file.name})` },
        }));
      }
      return listCatalogObjects(system)
        .filter((obj) => obj.type === "*FILE" || obj.type === "*PGM")
        .slice(0, 10)
        .map((obj) => ({
          line: `${obj.library}/${obj.object}  ${obj.type}  ${obj.text?.slice(0, 30) ?? ""}`,
          drillDown: { command: "DSPFD", input: `DSPFD FILE(${obj.library}/${obj.object})` },
        }));
    }

    case "source_pdm": {
      const members = listSourceMembers(system, "CLAIMS400", "QDDSSRC");
      if (members.length > 0) {
        return members.slice(0, 10).map((member) => ({
          line: `${member.library}/${member.file}  ${member.member}  ${member.sourceType}`,
          drillDown: { command: "DSPPGM", input: `DSPPGM PGM(${member.library}/${member.member})` },
        }));
      }
      return listProgramReferences(system).slice(0, 10).map((ref) => ({
        line: `${ref.library}/${ref.program}  ${ref.usage.padEnd(10)} ${ref.fileLibrary}/${ref.file}`,
        drillDown: { command: "DSPPGMREF", input: `DSPPGMREF PGM(${ref.library}/${ref.program})` },
      }));
    }

    case "ifs":
      return getIfsLinkCatalog(system).slice(0, 10).map((link) => ({
        line: `${link.directory}/${link.name}`.padEnd(34) + `${link.linkType.padEnd(6)} ${link.textDescription.slice(0, 24)}`,
        drillDown: { command: "DSPLNK", input: `DSPLNK OBJ('${link.directory}/${link.name}')` },
      }));

    case "ptf_license":
      return [
        { line: "5770SS1   Option  7   IBM i Access Family", drillDown: { command: "DSPPTFGRP", input: "DSPPTFGRP" } },
        { line: "5770SS1   Option 33   IBM i PASE" },
        { line: "PTF GROUP SF99940 level 25 installed" },
        { line: "License key DSPSYSLIC active", drillDown: { command: "DSPLICKEY", input: "DSPLICKEY" } },
      ];

    case "job_batch": {
      if (name.includes("SBM")) {
        return listSubmittedJobs(system).slice(0, 10).map((job) => ({
          line: `${job.jobNumber.padEnd(7)} ${job.userName.padEnd(10)} ${job.jobName.padEnd(12)} ${job.status}`,
          drillDown: { command: "DSPJOB", input: `DSPJOB JOB(${job.jobNumber}/${job.userName}/${job.jobName})` },
        }));
      }
      if (name.includes("SBSJOB")) {
        const sbs = name.match(/SBS\(([^)]+)\)/i)?.[1] ?? "QBATCH";
        return listJobsBySubsystem(system, sbs).slice(0, 10).map((job) => ({
          line: `${job.jobNumber.padEnd(7)} ${job.userName.padEnd(10)} ${job.jobName.padEnd(12)} ${job.status}`,
          drillDown: { command: "DSPJOB", input: `DSPJOB JOB(${job.jobNumber}/${job.userName}/${job.jobName})` },
        }));
      }
      if (name.includes("USRJOB")) {
        return listJobsByUser(system, session.userName ?? "QSECOFR").slice(0, 10).map((job) => ({
          line: `${job.jobNumber.padEnd(7)} ${job.userName.padEnd(10)} ${job.jobName.padEnd(12)} ${job.status}`,
          drillDown: { command: "DSPJOB", input: `DSPJOB JOB(${job.jobNumber}/${job.userName}/${job.jobName})` },
        }));
      }
      if (name.includes("JOBQ") || name.includes("JOBSCDE")) {
        const labJobs = rowsFromLabEntities(system, "job_entity", name.includes("JOBSCDE") ? "DSPJOBSCDE" : "DSPJOBQ", name.includes("JOBSCDE") ? "JOBSCDE" : "JOBQ");
        if (labJobs.length > 0) return labJobs;
        return listJobQueueEntries(system).slice(0, 10).map((job) => ({
          line: `${job.jobNumber.padEnd(7)} ${job.userName.padEnd(10)} ${job.jobName.padEnd(12)} ${job.status}`,
          drillDown: { command: "DSPJOB", input: `DSPJOB JOB(${job.jobNumber}/${job.userName}/${job.jobName})` },
        }));
      }
      return listActiveJobs(system).slice(0, 10).map((job) => ({
        line: `${job.jobNumber.padEnd(7)} ${job.userName.padEnd(10)} ${job.jobName.padEnd(12)} ${job.status}`,
        drillDown: { command: "DSPJOB", input: `DSPJOB JOB(${job.jobNumber}/${job.userName}/${job.jobName})` },
      }));
    }

    case "spool_print":
      return listSpooledFiles(system).slice(0, 10).map((file) => ({
        line: `${file.fileName.padEnd(10)} ${file.userName.padEnd(10)} ${file.status.padEnd(8)} ${file.spoolNumber}`,
        drillDown: { command: "DSPSPLF", input: `DSPSPLF FILE(${file.fileName})` },
      }));

    case "library_object": {
      if (name.startsWith("WRKLIB") || name === "DSPLIB" || name.includes("LIBL")) {
        return listLibrariesForWork(session).map((lib) => ({
          line: `${lib.name.padEnd(10)} ${lib.type.padEnd(12)} ${lib.text.slice(0, 40)}`,
          drillDown: { command: "DSPLIB", input: `DSPLIB LIB(${lib.name})` },
        }));
      }
      return listCatalogObjects(system).slice(0, 12).map((obj) => ({
        line: `${obj.library.padEnd(10)} ${obj.object.padEnd(10)} ${obj.type.padEnd(8)} ${obj.publicAuth}`,
        drillDown: { command: "DSPOBJD", input: `DSPOBJD OBJ(${obj.library}/${obj.object})` },
      }));
    }

    case "range":
    case "mission_lab":
    case "sql_services":
      if (definition.groupMenu) break;
      return loadFullCommandCatalog()
        .filter((cmd) => cmd.category === category && cmd.name !== definition.name)
        .slice(0, 10)
        .map((cmd) => ({
          line: `${cmd.name.padEnd(12)} ${cmd.displayName.slice(0, 48)}`,
          drillDown: { command: cmd.name, input: cmd.name },
        }));

    default:
      break;
  }

  if (name.includes("DSKSTS") || name.includes("HDWRSC") || name.includes("CFGSTS")) {
    return listDiskUnits(system).map((disk) => ({
      line: `${disk.unitNumber.padEnd(8)} ${disk.status.padEnd(10)} ${String(disk.percentUsed).padStart(3)}% used  ${disk.unitType}`,
    }));
  }

  if (name.includes("SBS")) {
    return listSubsystems(system).map((sbs) => ({
      line: `${sbs.name.padEnd(12)} ${sbs.status.padEnd(12)} ${sbs.description.slice(0, 36)}`,
      drillDown: { command: "DSPSBSD", input: `DSPSBSD SBS(${sbs.name})` },
    }));
  }

  if (definition.groupMenu) {
    return loadFullCommandCatalog()
      .filter((cmd) => cmd.groupMenu === definition.groupMenu && cmd.name !== definition.name)
      .slice(0, 12)
      .map((cmd) => ({
        line: `${cmd.name.padEnd(12)} ${cmd.displayName.slice(0, 48)}`,
        drillDown: { command: cmd.name, input: cmd.name },
      }));
  }

  const labRows = rowsFromLabEntities(system, category.replace(/[^a-z_]/gi, "_"), "DSP", "OBJ");
  if (labRows.length > 0) return labRows;

  return [
    {
      line: `${definition.name} — ${definition.displayName}`,
      drillDown: { command: definition.name, input: definition.name },
    },
    { line: `Category: ${category}` },
    { line: `System: ${system}` },
  ];
}

export function detailLinesForCatalogCommand(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parameters: Record<string, string>,
): string[] {
  const lines: string[] = [
    `Command . . . . . . . . . . . : ${definition.name}`,
    `System  . . . . . . . . . . . : ${session.systemName}`,
    `Category  . . . . . . . . . . : ${definition.category}`,
    "",
  ];

  for (const [key, value] of Object.entries(parameters)) {
    if (value) {
      lines.push(`${key.padEnd(28)}: ${value}`);
    }
  }

  if (Object.keys(parameters).length === 0) {
    lines.push("No parameters specified — showing catalog context.");
    lines.push("");
  }

  const objRef = parameters.OBJ ?? parameters.FILE ?? parameters.LIB;
  if (objRef?.includes("/")) {
    const [library, object] = objRef.split("/");
    const catalogObject = library && object ? getCatalogObject(session.systemName, library, object) : undefined;
    if (catalogObject) {
      lines.push(`Object type . . . . . . . . . : ${catalogObject.type}`);
      lines.push(`Public authority . . . . . . . : ${catalogObject.publicAuth}`);
      lines.push(`Owner . . . . . . . . . . . . : ${catalogObject.owner ?? "QSECOFR"}`);
    }
  }

  const rows = listRowsForCatalogCommand(definition, session);
  lines.push("Related entries:");
  for (const row of rows.slice(0, 8)) {
    lines.push(`  ${row.line}`);
  }

  return lines;
}
