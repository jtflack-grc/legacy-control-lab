import type { CommandHandler } from "./commandHandlers.js";
import type { CatalogCommandDefinition } from "../catalog/commandTypes.js";
import type { IbmiSession } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { getParameter, getQualifiedObject } from "./commandParser.js";
import { listRowsForCatalogCommand } from "./catalogDataProviders.js";
import { listLinkServers } from "./networkService.js";
import { listDiskUnits } from "./systemMonitorService.js";
import { getPhysicalFile } from "./physicalFileService.js";
import { listCatalogObjects } from "./objectCatalogService.js";
import { listCatalogLabEntities } from "../db/repositories/catalogLabRepository.js";
import { listProgramReferences } from "./sourceMemberService.js";
import { getLibraryListSections } from "./libraryListService.js";
import {
  createShowcaseWorkScreen,
  createDisplayNetworkAttributesScreen,
  createDisplayNetworkStatusScreen,
  createDisplayLineDescriptionScreen,
  createDisplayMemberScreen,
  createDisplayDatabaseFileScreen,
  createDisplayRecordFormatScreen,
  createDisplayJobScheduleScreen,
  createDisplayMessageQueueDetailScreen,
  createDisplayDataQueueScreen,
  createDisplayJobDescriptionScreen,
  createDisplayUserClassScreen,
  createDisplayObjectListScreen,
  createDisplayPtfGroupScreen,
  createDisplayProgramAdoptScreen,
} from "../screen-runtime/screens/showcaseScreens.js";
import {
  createDisplayJobScheduleEntryScreen,
  createWorkJobScheduleEntriesScreen,
  payrollJobScheduleRows,
} from "../screen-runtime/screens/jobScheduleScreens.js";

function asCatalogDefinition(definition: {
  name: string;
  displayName: string;
  category: string;
  status: string;
}): CatalogCommandDefinition {
  return definition as CatalogCommandDefinition;
}

function bindWorkContext(
  session: IbmiSession,
  definition: { name: string; displayName: string; category: string; status: string },
): void {
  session.catalogWorkContext = {
    screenId: definition.name,
    rows: listRowsForCatalogCommand(asCatalogDefinition(definition), session),
  };
}

function workHandler(
  screenId: string,
  title: string,
  category: string,
  columnHeader: string,
  rowsFor?: (session: IbmiSession, command?: ParsedCommand) => ReturnType<typeof listRowsForCatalogCommand>,
): CommandHandler {
  return (session, command, definition) => {
    const rows =
      rowsFor?.(session, command) ??
      listRowsForCatalogCommand(asCatalogDefinition(definition), session);
    bindWorkContext(session, definition);
    return {
      kind: "screen",
      screen: createShowcaseWorkScreen(screenId, title, session.systemName, category, columnHeader, rows),
    };
  };
}

function parseJobd(command: ParsedCommand): { library: string; jobd: string } {
  const raw = getParameter(command, "JOBD") ?? "QBATCH/QDFTJOBD";
  const [library = "QBATCH", jobd = "QDFTJOBD"] = raw.split("/");
  return { library, jobd };
}

export const showcaseHandlers: Record<string, CommandHandler> = {
  workTcpIpServices: workHandler(
    "WRKTCPIP",
    "Work with TCP/IP",
    "network_tcpip",
    "Service     Status      Description",
    (session) =>
      listLinkServers().map((server) => ({
        line: `${server.name.padEnd(14)} ${server.status.padEnd(12)} ${server.description.slice(0, 34)}`,
        drillDown: { command: "DSPLNKSVR", input: `DSPLNKSVR SERVER(${server.name})` },
      })),
  ),

  workHardwareResources: (session, _command, definition) => {
    const disks = listDiskUnits(session.systemName);
    bindWorkContext(session, definition);
    const rows = disks.map((disk) => ({
      line: `${disk.unitNumber.padEnd(8)} ${disk.status.padEnd(10)} ${String(disk.percentUsed).padStart(3)}% ${disk.unitType}`,
      drillDown: { command: "DSPHDWRSC", input: "DSPHDWRSC" },
    }));
    return {
      kind: "screen",
      screen: createShowcaseWorkScreen(
        "WRKHDWRSC",
        "Work with Hardware Resources",
        session.systemName,
        "network_tcpip",
        "Unit     Status     %Used  Type",
        rows,
      ),
    };
  },

  displayNetworkAttributes: (session) => ({
    kind: "screen",
    screen: createDisplayNetworkAttributesScreen(session.systemName),
  }),

  displayNetworkStatus: (session) => ({
    kind: "screen",
    screen: createDisplayNetworkStatusScreen(session.systemName),
  }),

  displayLineDescription: (session) => ({
    kind: "screen",
    screen: createDisplayLineDescriptionScreen(session.systemName),
  }),

  workDatabaseFiles: workHandler(
    "WRKFILE",
    "Work with Files",
    "database_file",
    "File                 Type    Text",
  ),

  workDatabaseMembers: workHandler(
    "WRKMBR",
    "Work with Members",
    "database_file",
    "Member      Type    Text",
    (session, command) => {
      const qualified = getQualifiedObject(command ?? { name: "WRKMBR", parameters: {}, positionals: [], raw: "WRKMBR" }, "FILE");
      const library = qualified?.library ?? "PAYROLL";
      const file = qualified?.object ?? "PAYMST";
      const physical = getPhysicalFile(session.systemName, library, file);
      const member = physical?.member ?? "PAYMST";
      return [
        {
          line: `${member.padEnd(12)} PF-DTA  Primary member`,
          drillDown: { command: "DSPMBR", input: `DSPMBR FILE(${library}/${file}) MBR(${member})` },
        },
      ];
    },
  ),

  displayDatabaseMember: (session, command) => {
    const qualified = getQualifiedObject(command, "FILE");
    const library = qualified?.library ?? "PAYROLL";
    const file = qualified?.object ?? "PAYMST";
    const member = getParameter(command, "MBR") ?? file;
    return {
      kind: "screen",
      screen: createDisplayMemberScreen(session.systemName, library, file, member),
    };
  },

  displayDatabaseFile: (session, command) => {
    const qualified = getQualifiedObject(command, "FILE");
    const library = qualified?.library ?? "PAYROLL";
    const file = qualified?.object ?? "PAYMST";
    const physical = getPhysicalFile(session.systemName, library, file);
    return {
      kind: "screen",
      screen: createDisplayDatabaseFileScreen(
        session.systemName,
        library,
        file,
        physical?.fileType ?? "*PF",
        physical?.textDescription ?? "Database file",
      ),
    };
  },

  displayRecordFormat: (session, command) => {
    const qualified = getQualifiedObject(command, "FILE");
    const library = qualified?.library ?? "PAYROLL";
    const file = qualified?.object ?? "PAYMST";
    const format = getParameter(command, "RCDFMT") ?? physicalFormatName(session, library, file);
    return {
      kind: "screen",
      screen: createDisplayRecordFormatScreen(session.systemName, library, file, format),
    };
  },

  workJobSchedulerEntries: (session) => {
    const rows =
      session.systemName === "CLAIMS400"
        ? payrollJobScheduleRows()
        : jobSchedulerRows(session);
    session.catalogWorkContext = { screenId: "WRKJOBSCDE", rows };
    return {
      kind: "screen",
      screen: createWorkJobScheduleEntriesScreen(session.systemName, rows),
    };
  },

  workJobSchedules: workHandler(
    "WRKJOBSCD",
    "Work with Job Schedules",
    "job_batch",
    "Schedule    Status     Description",
    () => [
      {
        line: "NIGHTLY     *ACTIVE    Nightly batch window",
        drillDown: { command: "DSPJOBSCD", input: "DSPJOBSCD JOBSCD(NIGHTLY)" },
      },
      {
        line: "WEEKLY      *ACTIVE    Weekly close",
        drillDown: { command: "DSPJOBSCD", input: "DSPJOBSCD JOBSCD(WEEKLY)" },
      },
    ],
  ),

  displayJobSchedulerEntry: (session, command) => {
    const entry = getParameter(command, "JOBSCDE") ?? getParameter(command, "JOB") ?? "NIGHTLY";
    return {
      kind: "screen",
      screen: createDisplayJobScheduleEntryScreen(session.systemName, entry),
    };
  },

  displayJobSchedule: (session, command) => {
    const schedule = getParameter(command, "JOBSCD") ?? "NIGHTLY";
    return {
      kind: "screen",
      screen: createDisplayJobScheduleScreen(session.systemName, schedule),
    };
  },

  displayMessageQueueDetail: (session, command) => {
    const queue = getParameter(command, "MSGQ") ?? "QSYS/QSYSOPR";
    return {
      kind: "screen",
      screen: createDisplayMessageQueueDetailScreen(session.systemName, queue),
    };
  },

  workDataQueues: workHandler(
    "WRKDTAQ",
    "Work with Data Queues",
    "message_queue",
    "Queue       Status     Entries",
    (session) =>
      listCatalogLabEntities(session.systemName, "data_queue").map((entity) => ({
        line: `${entity.entityId.padEnd(12)} *AVAILABLE 0`,
        drillDown: { command: "DSPDTAQ", input: `DSPDTAQ DTAQ(${entity.entityId})` },
      })).concat([
        {
          line: "LABDTAQ      *AVAILABLE 0",
          drillDown: { command: "DSPDTAQ", input: "DSPDTAQ DTAQ(LABDTAQ)" },
        },
      ]),
  ),

  displayDataQueue: (session, command) => {
    const queue = getParameter(command, "DTAQ") ?? "LABDTAQ";
    return {
      kind: "screen",
      screen: createDisplayDataQueueScreen(session.systemName, queue),
    };
  },

  workJobDescriptions: workHandler(
    "WRKJOBD",
    "Work with Job Descriptions",
    "user_profile",
    "Job description      Library",
    () => [
      {
        line: "QDFTJOBD             QBATCH",
        drillDown: { command: "DSPJOBD", input: "DSPJOBD JOBD(QBATCH/QDFTJOBD)" },
      },
      {
        line: "TRAINER01            QGPL",
        drillDown: { command: "DSPJOBD", input: "DSPJOBD JOBD(QGPL/TRAINER01)" },
      },
    ],
  ),

  displayJobDescription: (session, command) => {
    const { library, jobd } = parseJobd(command);
    return {
      kind: "screen",
      screen: createDisplayJobDescriptionScreen(session.systemName, jobd, library),
    };
  },

  workUserClasses: workHandler(
    "WRKUSRCLS",
    "Work with User Classes",
    "user_profile",
    "Class       Description",
    () => [
      { line: "*USER       End user", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*USER)" } },
      { line: "*PGMR       Programmer", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*PGMR)" } },
      { line: "*SECOFR     Security officer", drillDown: { command: "DSPUSRCLS", input: "DSPUSRCLS CLS(*SECOFR)" } },
    ],
  ),

  displayUserClass: (session, command) => {
    const userClass = getParameter(command, "CLS") ?? "*USER";
    return {
      kind: "screen",
      screen: createDisplayUserClassScreen(session.systemName, userClass),
    };
  },

  workObjectLocks: workHandler(
    "WRKOBJLCK",
    "Work with Object Locks",
    "library_object",
    "Object / job lock holder",
    (session) =>
      listCatalogObjects(session.systemName)
        .slice(0, 8)
        .map((obj) => ({
          line: `${obj.library}/${obj.object}  ${obj.type}  *SHRRD`,
          drillDown: { command: "DSPOBJD", input: `DSPOBJD OBJ(${obj.library}/${obj.object})` },
        })),
  ),

  displayObjectList: (session, command) => {
    const library = getParameter(command, "LIB") ?? session.currentLibrary ?? "CLAIMS400";
    return {
      kind: "screen",
      screen: createDisplayObjectListScreen(session.systemName, library),
    };
  },

  workWriters: workHandler(
    "WRKWTR",
    "Work with Writers",
    "spool_print",
    "Writer      Status     Device",
    () => [
      {
        line: "QPRT01      *ACTIVE    PRT01",
        drillDown: { command: "DSPOUTQ", input: "DSPOUTQ OUTQ(QPRINT)" },
      },
      {
        line: "QAUDWTR     *ENDED     AUDP01",
        drillDown: { command: "DSPOUTQ", input: "DSPOUTQ OUTQ(QAUDOUTQ)" },
      },
    ],
  ),

  displayPtfGroup: (session) => ({
    kind: "screen",
    screen: createDisplayPtfGroupScreen(session.systemName),
  }),

  workPrograms: workHandler(
    "WRKPGM",
    "Work with Programs",
    "source_pdm",
    "Program     Library   Usage",
    (session) =>
      listProgramReferences(session.systemName).slice(0, 10).map((ref) => ({
        line: `${ref.program.padEnd(12)} ${ref.library.padEnd(10)} ${ref.usage}`,
        drillDown: { command: "DSPPGM", input: `DSPPGM PGM(${ref.library}/${ref.program})` },
      })),
  ),

  displayProgramAdopt: (session, command) => {
    const qualified = getQualifiedObject(command, "PGM") ?? getQualifiedObject(command, "OBJ");
    const program = qualified ? `${qualified.library}/${qualified.object}` : "CLAIMS400/CLMMAINT";
    return {
      kind: "screen",
      screen: createDisplayProgramAdoptScreen(session.systemName, program),
    };
  },

  workLibraryList: (session, _command, definition) => {
    const sections = getLibraryListSections(session);
    const rows = [
      ...sections.system.map((lib) => ({
        line: `${lib.padEnd(12)} *SYSVAL`,
        drillDown: { command: "DSPLIB", input: `DSPLIB LIB(${lib})` },
      })),
      ...sections.product.map((lib) => ({
        line: `${lib.padEnd(12)} *PROD`,
        drillDown: { command: "DSPLIB", input: `DSPLIB LIB(${lib})` },
      })),
      ...(sections.current
        ? [
            {
              line: `${sections.current.padEnd(12)} *CUR`,
              drillDown: { command: "DSPLIB", input: `DSPLIB LIB(${sections.current})` },
            },
          ]
        : []),
      ...sections.user.map((lib) => ({
        line: `${lib.padEnd(12)} *USR`,
        drillDown: { command: "DSPLIB", input: `DSPLIB LIB(${lib})` },
      })),
    ];
    bindWorkContext(session, definition);
    return {
      kind: "screen",
      screen: createShowcaseWorkScreen(
        "WRKLIBL",
        "Work with Library List",
        session.systemName,
        "library_object",
        "Library     Attribute",
        rows,
      ),
    };
  },
};

function physicalFormatName(session: IbmiSession, library: string, file: string): string {
  return getPhysicalFile(session.systemName, library, file)?.recordFormat ?? "PAYFMT";
}

function jobSchedulerRows(session: IbmiSession) {
  const lab = listCatalogLabEntities(session.systemName, "job_entity");
  if (lab.length > 0) {
    return lab.map((entity) => ({
      line: `${entity.entityId.padEnd(12)} BACKUPADM  *ENABLED`,
      drillDown: { command: "DSPJOBSCDE", input: `DSPJOBSCDE JOBSCDE(${entity.entityId})` },
    }));
  }
  return [
    {
      line: "NIGHTLY      BACKUPADM  *ENABLED",
      drillDown: { command: "DSPJOBSCDE", input: "DSPJOBSCDE JOBSCDE(NIGHTLY)" },
    },
    {
      line: "WEEKLY       APCLERK    *ENABLED",
      drillDown: { command: "DSPJOBSCDE", input: "DSPJOBSCDE JOBSCDE(WEEKLY)" },
    },
  ];
}
