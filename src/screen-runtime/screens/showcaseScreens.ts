import type { ScreenDefinition, ScreenField } from "../screen.js";
import type { CatalogListRow } from "../../ibmi-runtime/catalogDataProviders.js";
import { workOptionHintFromMatrix } from "../../ibm74/referenceScreenService.js";
import {
  commandField,
  createInfoScreen,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";

export function createShowcaseWorkScreen(
  screenId: string,
  title: string,
  systemName: string,
  category: string,
  columnHeader: string,
  rows: CatalogListRow[],
): ScreenDefinition {
  const fields: ScreenField[] = [
    ibmScreenHeader(screenId, title, systemName),
    outputField("OPT", 3, 6, "Type options, press Enter."),
    outputField("OPTS", 4, 6, workOptionHintFromMatrix(screenId, category)),
    outputField("LIST", 6, 6, columnHeader),
    ibmColumnHeader(6, 6, columnHeader),
  ];

  rows.slice(0, 10).forEach((row, index) => {
    const lineRow = 7 + index;
    fields.push(commandField(`WOPT${index}`, lineRow, 6, 2));
    fields.push(outputField(`WROW${index}`, lineRow, 10, row.line.slice(0, 70)));
  });

  if (rows.length === 0) {
    fields.push(outputField("EMPTY", 7, 10, "No entries found."));
  }

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: screenId as ScreenDefinition["id"],
    title,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createShowcaseDisplayScreen(
  screenId: string,
  title: string,
  systemName: string,
  detailLines: Array<{ label: string; value: string; id: string }>,
): ScreenDefinition {
  const fields: ScreenField[] = [
    ibmScreenHeader(screenId, title, systemName),
    outputField("TITLE", 3, 2, title.slice(0, 76)),
  ];

  detailLines.forEach((line, index) => {
    const row = 4 + index;
    fields.push(
      outputField(
        line.id,
        row,
        2,
        `${line.label.padEnd(28)} . . : ${line.value}`.slice(0, 78),
      ),
    );
  });

  fields.push(outputField("BODY", 20, 2, `${screenId} — Legacy Control Lab showcase display`));
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F1=Help   F12=Cancel"));

  return {
    id: screenId as ScreenDefinition["id"],
    title,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayNetworkAttributesScreen(systemName: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPNETA", "Display Network Attributes", systemName, [
    { id: "HOSTNAME", label: "Host name", value: "CLAIMS400" },
    { id: "DOMAIN", label: "Domain", value: "LAB.LOCAL" },
    { id: "SRV", label: "TCP/IP status", value: "*ACTIVE" },
    { id: "STAT", label: "Interface status", value: "*RUNNING" },
    { id: "PORT", label: "Default domain", value: "LAB.LOCAL" },
    { id: "ROUTER", label: "Default router", value: "10.10.10.1" },
  ]);
}

export function createDisplayNetworkStatusScreen(systemName: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPNETSTAT", "Display Network Status", systemName, [
    { id: "SRV", label: "TCP/IP stack", value: "*STARTED" },
    { id: "STAT", label: "IPv4 status", value: "*ACTIVE" },
    { id: "PORT", label: "Active listeners", value: "14" },
    { id: "IFACE", label: "Line description", value: "ETHLINE" },
    { id: "ADDR", label: "Internet address", value: "10.10.10.40" },
  ]);
}

export function createDisplayLineDescriptionScreen(systemName: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPLIN", "Display Line Description", systemName, [
    { id: "LINE", label: "Line description", value: "ETHLINE" },
    { id: "STAT", label: "Resource status", value: "*ACTIVE" },
    { id: "TYPE", label: "Line type", value: "*ELAN" },
    { id: "ADDR", label: "Internet address", value: "10.10.10.40" },
    { id: "MASK", label: "Subnet mask", value: "255.255.255.0" },
  ]);
}

export function createDisplayMemberScreen(
  systemName: string,
  library: string,
  file: string,
  member: string,
): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPMBR", "Display Member Description", systemName, [
    { id: "OBJ", label: "File", value: `${library}/${file}` },
    { id: "MBR", label: "Member", value: member },
    { id: "TYPE", label: "Source type", value: "PF-DTA" },
    { id: "TEXT", label: "Text description", value: "Member description" },
    { id: "ROWS", label: "Number of records", value: "1,284" },
  ]);
}

export function createDisplayDatabaseFileScreen(
  systemName: string,
  library: string,
  file: string,
  fileType: string,
  text: string,
): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPFILE", "Display Database File", systemName, [
    { id: "OBJ", label: "File", value: `${library}/${file}` },
    { id: "TYPE", label: "File type", value: fileType },
    { id: "PUBAUT", label: "Public authority", value: "*USE" },
    { id: "TEXT", label: "Text description", value: text.slice(0, 50) },
    { id: "MBRS", label: "Number of members", value: "1" },
  ]);
}

export function createDisplayRecordFormatScreen(
  systemName: string,
  library: string,
  file: string,
  format: string,
): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPRCDFMT", "Display Record Format", systemName, [
    { id: "OBJ", label: "File", value: `${library}/${file}` },
    { id: "RCDFMT", label: "Record format", value: format },
    { id: "TYPE", label: "Format level", value: "*FIRST" },
    { id: "FLDS", label: "Number of fields", value: "12" },
    { id: "LEN", label: "Record length", value: "256" },
  ]);
}

export function createDisplayJobScheduleEntryScreen(systemName: string, entryId: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPJOBSCDE", "Display Job Schedule Entry", systemName, [
    { id: "JOB", label: "Job name", value: entryId },
    { id: "JSTAT", label: "Status", value: "*ENABLED" },
    { id: "CMD", label: "Command", value: "CALL PGM(PAYROLL/CLOSE)" },
    { id: "FREQ", label: "Frequency", value: "*WEEKLY" },
    { id: "TIME", label: "Scheduled time", value: "02:00:00" },
  ]);
}

export function createDisplayJobScheduleScreen(systemName: string, schedule: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPJOBSCD", "Display Job Schedule", systemName, [
    { id: "JOB", label: "Schedule", value: schedule },
    { id: "JSTAT", label: "Status", value: "*ACTIVE" },
    { id: "ENTRIES", label: "Entries", value: "3" },
    { id: "NEXT", label: "Next run", value: "Tomorrow 02:00" },
    { id: "DESC", label: "Description", value: "Batch maintenance window" },
  ]);
}

export function createDisplayMessageQueueDetailScreen(systemName: string, queue: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPMSGQ", "Display Message Queue", systemName, [
    { id: "MSGQ", label: "Message queue", value: queue },
    { id: "STAT", label: "Status", value: "*RELEASED" },
    { id: "DEPTH", label: "Current messages", value: "4" },
    { id: "MAX", label: "Maximum size", value: "*NOMAX" },
    { id: "TEXT", label: "Text description", value: "Operator message queue" },
  ]);
}

export function createDisplayDataQueueScreen(systemName: string, queue: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPDTAQ", "Display Data Queue", systemName, [
    { id: "DTAQ", label: "Data queue", value: queue },
    { id: "STAT", label: "Status", value: "*AVAILABLE" },
    { id: "ENTRIES", label: "Entries", value: "0" },
    { id: "MAX", label: "Maximum entries", value: "*NOMAX" },
    { id: "TEXT", label: "Text description", value: "Lab data queue" },
  ]);
}

export function createDisplayJobDescriptionScreen(
  systemName: string,
  jobd: string,
  library: string,
): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPJOBD", "Display Job Description", systemName, [
    { id: "JOBD", label: "Job description", value: `${library}/${jobd}` },
    { id: "JOBQ", label: "Job queue", value: "QBATCH" },
    { id: "OUTQ", label: "Output queue", value: "*JOB" },
    { id: "RUNPTY", label: "Run priority", value: "50" },
    { id: "TEXT", label: "Text description", value: "Training job description" },
  ]);
}

export function createDisplayUserClassScreen(systemName: string, userClass: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPUSRCLS", "Display User Class", systemName, [
    { id: "CLS", label: "User class", value: userClass },
    { id: "SEC", label: "Security level", value: "40" },
    { id: "LIMIT", label: "Limit capabilities", value: "*NO" },
    { id: "TEXT", label: "Text description", value: "IBM i user class" },
    { id: "OWNER", label: "Owner", value: "QSECOFR" },
  ]);
}

export function createDisplayObjectListScreen(systemName: string, library: string): ScreenDefinition {
  return createInfoScreen("DSPOBJL", "Display Object List", systemName, "", [
    `Library  . . . . . . . . . . . : ${library}`,
    "Object list (first 8 entries):",
    "  PAYMST      *FILE      Payroll master",
    "  PAYHDR      *FILE      Payroll header",
    "  CLMMAINT    *PGM       Claims maintenance",
    "  QDDSSRC     *FILE      DDS source",
  ]);
}

export function createDisplayPtfGroupScreen(systemName: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPPTFGRP", "Display PTF Group", systemName, [
    { id: "GROUP", label: "PTF group", value: "SF99740" },
    { id: "STAT", label: "Status", value: "*INSTALLED" },
    { id: "LEVEL", label: "Group level", value: "25" },
    { id: "TEXT", label: "Description", value: "IBM i base group" },
    { id: "SYS", label: "System", value: systemName },
  ]);
}

export function createDisplayProgramAdoptScreen(systemName: string, program: string): ScreenDefinition {
  return createShowcaseDisplayScreen("DSPPGMADP", "Display Program Adopt", systemName, [
    { id: "PGM", label: "Program", value: program },
    { id: "ADP", label: "Adopt authority", value: "*USER" },
    { id: "OWNER", label: "Owner", value: "QSECOFR" },
    { id: "USE", label: "Use adopted authority", value: "*YES" },
    { id: "TEXT", label: "Text description", value: "Program adopt review" },
  ]);
}
