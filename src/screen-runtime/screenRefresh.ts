import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { ScreenDefinition } from "./screen.js";
import { routeAuditMenuInput } from "../ibmi-runtime/commandRuntime.js";
import { createWorkUserProfilesScreen } from "./screens/workUserProfiles.js";
import {
  createDisplaySystemValueScreen,
  createWorkWithSystemValuesScreen,
} from "./screens/displaySystemValue.js";
import { createWorkObjectsScreen } from "./screens/workObjects.js";
import { createWorkObjectOwnerScreen } from "./screens/workObjectOwner.js";
import {
  createEditAuthorizationListScreen,
  ensureAutlEditContext,
} from "./screens/editAuthorizationList.js";
import { createDisplayJournalScreen } from "./screens/displayJournal.js";
import { createDisplaySecurityAuditScreen } from "./screens/displaySecurityAudit.js";
import { listAuditJournalEntries } from "../ibmi-runtime/auditJournalService.js";
import { createWorkSpooledFilesScreen } from "./screens/workSpooledFiles.js";
import { createWorkJobsScreen } from "./screens/workJobs.js";
import {
  createWorkDiskStatusScreen,
  createWorkSystemActivityScreen,
  createWorkSystemStatusScreen,
} from "./screens/systemMonitorScreens.js";
import { listActiveJobs } from "../ibmi-runtime/jobService.js";
import {
  getMonitorElapsedTime,
  getSystemActivity,
  getSystemStatus,
  listDiskUnits,
} from "../ibmi-runtime/systemMonitorService.js";
import { createFindingListScreen } from "./screens/findingEditor.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { ensureMissionAttempt, getMissionProgress } from "../missions/missionEngine.js";
import { getDefaultMission, getMission } from "../ibmi-runtime/missionService.js";
import { getMissionAttempt, listEvidenceRequirements } from "../db/repositories/missionRepository.js";
import { createDisplayEvidenceScreen } from "./screens/missionScreens.js";
import { createDisplayMissionScreen } from "./screens/governanceScreens.js";
import { createDisplayFileFieldDescriptionScreen } from "./screens/displayFileFieldDescription.js";
import { createWorkObjectLinksScreen } from "./screens/workObjectLinks.js";
import {
  createDisplayLibraryScreen,
  createWorkLibrariesScreen,
  listLibraryObjects,
} from "./screens/libraryScreens.js";
import { getLibraryDescription, listLibrariesForWork } from "../ibmi-runtime/libraryAdminService.js";
import { createDisplayJobLogForSession } from "./screens/displayJobLog.js";
import {
  createNetStatConnectionScreen,
  createNetStatInterfaceScreen,
  createNetStatMenuScreen,
  createNetStatRouteScreen,
} from "./screens/spoolNetworkScreens.js";
import { createRunSqlResultScreen } from "./screens/displayRunSql.js";
import { getPhysicalFile } from "../ibmi-runtime/physicalFileService.js";
import { executeRunSql } from "../ibmi-runtime/runSqlService.js";
import { listActiveRangeSystems } from "../range/rangeService.js";
import { getCampaignMissionStatuses, listCampaignSummaries } from "../range/campaignService.js";
import { listScorebookEntries } from "../db/repositories/scorebookRepository.js";
import {
  createWorkCampaignMissionsScreen,
  createWorkCampaignsScreen,
  createWorkRangeScreen,
  createWorkScorebookScreen,
  createWorkScenariosScreen,
} from "./screens/rangeScreens.js";
import { listScenarioPacks } from "../range/scenarioPack.js";
import { PAGED_SUBFILE_SCREENS } from "../ibmi-runtime/subfilePaging.js";
import { createDisplayMessagesForSession } from "./screens/displayMessagesRouter.js";
import { createWorkPtfGroupsScreen } from "./screens/workPtfGroups.js";
import { createWorkPtfsScreen } from "./screens/workPtfs.js";
import { createDisplayPtfGroupScreen } from "./screens/displayPtfGroup.js";
import { getPtfGroup, listAllPtfs, listPtfGroups, listPtfsForGroup } from "../ibmi-runtime/ptfService.js";
import { createWorkSqlServicesScreen } from "./screens/workSqlServices.js";
import {
  createDisplayPhysicalFileMemberScreen,
  createDisplayProgramReferencesScreen,
  createWorkMemberPdmScreen,
  createWorkObjectPdmScreen,
} from "./screens/sourceScreens.js";
import {
  getSourceMember,
  listProgramReferences,
  listSourceFiles,
  listSourceMembers,
} from "../ibmi-runtime/sourceMemberService.js";

const REFRESH_COMMANDS: Partial<Record<ScreenDefinition["id"], string>> = {
  WRKUSRPRF: "WRKUSRPRF",
  WRKSYSVAL: "WRKSYSVAL",
  DSPSYSVAL: "WRKSYSVAL",
  WRKOBJ: "WRKOBJ",
  WRKOBJOWN: "WRKOBJOWN",
  DSPJRN: "DSPJRN JRN(QSYS/QAUDJRN) ENTTYP(PW AF CP)",
  DSPSECAUD: "DSPSECAUD",
  DSPAUDJRNE: "DSPAUDJRNE ENTTYP(PW AF CP)",
  WRKACTJOB: "WRKACTJOB",
  WRKDSKSTS: "WRKDSKSTS",
  WRKSYSSTS: "WRKSYSSTS",
  WRKSYSACT: "WRKSYSACT",
  DSPSYSSTS: "DSPSYSSTS",
  WRKJOB: "WRKJOB",
  WRKSBSJOB: "WRKSBSJOB SBS(QINTER)",
  WRKUSRJOB: "WRKUSRJOB",
  NETSTAT: "NETSTAT",
  WRKSPLF: "WRKSPLF",
  DSPMSG: "DSPMSG MSGQ(QSYSOPR)",
  WRKPTFGRP: "WRKPTFGRP",
  WRKPTF: "WRKPTF",
  WRKRANGE: "WRKRANGE",
  WRKCMPGN: "WRKCMPGN",
  WRKCMPMSN: "WRKCMPMSN",
  WRKSCORE: "WRKSCORE",
  WRKSCN: "WRKSCN",
  FINDING: "WRKFINDING",
  DSPMISSION: "DSPMISSION",
  DSPEVID: "DSPEVID",
};

/** Screens whose refresh must not re-run the catalog command (would reset paging state). */
const STATEFUL_REFRESH_SCREENS = new Set<ScreenDefinition["id"]>(["DSPMSG"]);

export function refreshScreen(
  session: IbmiSession,
  screenId: ScreenDefinition["id"],
): ScreenDefinition | undefined {
  const command = REFRESH_COMMANDS[screenId];
  // Paged subfiles keep session.subfilePage — re-routing WRKSYSVAL etc. resets page to 0.
  if (command && !PAGED_SUBFILE_SCREENS.has(screenId) && !STATEFUL_REFRESH_SCREENS.has(screenId)) {
    const route = routeAuditMenuInput(session, command);
    if (route.kind === "screen") return route.screen;
  }

  const systemName = session.systemName;
  const userName = session.userName ?? "AUDIT";

  switch (screenId) {
    case "WRKUSRPRF":
      return createWorkUserProfilesScreen(systemName, userName, session.subfilePage?.WRKUSRPRF ?? 0);
    case "WRKSYSVAL":
      return createWorkWithSystemValuesScreen(
        systemName,
        userName,
        "WRKSYSVAL",
        session.subfilePage?.WRKSYSVAL ?? 0,
      );
    case "DSPSYSVAL":
      return createDisplaySystemValueScreen(systemName, userName, session.subfilePage?.DSPSYSVAL ?? 0);
    case "WRKOBJ":
      return createWorkObjectsScreen(systemName, userName, {}, session.subfilePage?.WRKOBJ ?? 0);
    case "WRKOBJOWN": {
      const ctx = session.objOwnContext ?? { userProfile: userName, objType: "*ALL" };
      return createWorkObjectOwnerScreen(systemName, ctx, session.subfilePage?.WRKOBJOWN ?? 0);
    }
    case "EDTAUTL": {
      const ctx = ensureAutlEditContext(session, session.autlEditContext?.listName ?? "PAYROLL");
      return createEditAuthorizationListScreen(systemName, ctx.listName, ctx.members);
    }
    case "DSPSECAUD": {
      const afEntries =
        session.journalContext?.entries ??
        listAuditJournalEntries(systemName, { entryType: "AF", attemptId: session.missionAttemptId });
      return createDisplaySecurityAuditScreen(
        systemName,
        afEntries,
        session.subfilePage?.DSPSECAUD ?? 0,
      );
    }
    case "DSPJRN":
    case "DSPAUDJRNE":
      return createDisplayJournalScreen(
        systemName,
        userName,
        {
          journal: "QAUDJRN",
          library: "QSYS",
          entryTypes: screenId === "DSPAUDJRNE" ? "PW AF CP" : "PW AF CP",
          entries: session.journalContext?.entries,
          page: session.subfilePage?.[screenId] ?? 0,
        },
        screenId,
      );
    case "WRKACTJOB":
      return createWorkJobsScreen(
        systemName,
        "Work with Active Jobs",
        "WRKACTJOB",
        listActiveJobs(systemName),
        session.subfilePage?.WRKACTJOB ?? 0,
      );
    case "WRKLIB":
      return createWorkLibrariesScreen(
        systemName,
        listLibrariesForWork(session),
        session.subfilePage?.WRKLIB ?? 0,
      );
    case "DSPLIB": {
      const libCtx = session.libraryContext;
      if (!libCtx) return undefined;
      const library = getLibraryDescription(systemName, libCtx.name);
      if (!library) return undefined;
      return createDisplayLibraryScreen(
        systemName,
        library,
        listLibraryObjects(systemName, library.name),
        session.subfilePage?.DSPLIB ?? 0,
      );
    }
    case "DSPJOBLOG":
      return createDisplayJobLogForSession(session);
    case "NETSTAT":
      return createNetStatMenuScreen(systemName);
    case "NETSTATIFC":
      return createNetStatInterfaceScreen(systemName);
    case "NETSTATCNN":
      return createNetStatConnectionScreen(systemName);
    case "NETSTATRTE":
      return createNetStatRouteScreen(systemName);
    case "WRKDSKSTS":
      return createWorkDiskStatusScreen(
        systemName,
        listDiskUnits(systemName),
        getMonitorElapsedTime(session.monitorStatsResetAt),
      );
    case "WRKSYSSTS":
      return createWorkSystemStatusScreen(
        systemName,
        getSystemStatus(systemName, session.monitorStatsResetAt),
      );
    case "WRKSYSACT":
      return createWorkSystemActivityScreen(systemName, getSystemActivity(systemName));
    case "WRKSPLF":
      return createWorkSpooledFilesScreen(systemName, userName, session.subfilePage?.WRKSPLF ?? 0);
    case "DSPMSG": {
      const queue = session.messageContext?.queueName ?? "QSYSOPR";
      return createDisplayMessagesForSession(session, queue);
    }
    case "DSPMSGINT": {
      const queue = session.messageContext?.queueName ?? "QSYSOPR";
      return createDisplayMessagesForSession(session, queue);
    }
    case "WRKPTFGRP":
      return createWorkPtfGroupsScreen(
        systemName,
        listPtfGroups(systemName),
        session.subfilePage?.WRKPTFGRP ?? 0,
      );
    case "WRKPTF":
      return createWorkPtfsScreen(
        systemName,
        listAllPtfs(systemName),
        session.subfilePage?.WRKPTF ?? 0,
      );
    case "DSPPTFGRP": {
      const groupId = session.ptfContext?.groupId;
      const group = groupId ? getPtfGroup(groupId) : undefined;
      if (!group) return undefined;
      return createDisplayPtfGroupScreen(
        systemName,
        group,
        listPtfsForGroup(group.groupId),
        session.subfilePage?.DSPPTFGRP ?? 0,
      );
    }
    case "FINDING": {
      const findings = session.missionAttemptId ? listFindings(session.missionAttemptId) : [];
      return createFindingListScreen(systemName, userName, findings);
    }
    case "DSPMISSION": {
      ensureMissionAttempt(session);
      const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
      const mission = attempt
        ? getMission(attempt.missionId, systemName)
        : getDefaultMission(systemName);
      if (!mission) return undefined;
      const progress = getMissionProgress(session);
      const evidenceHints = listEvidenceRequirements(mission.id)
        .filter((req) => !req.optional)
        .map((req) => req.description);
      return createDisplayMissionScreen(
        systemName,
        userName,
        mission,
        progress?.evidenceCoverage,
        evidenceHints,
      );
    }
    case "DSPEVID": {
      ensureMissionAttempt(session);
      const progress = getMissionProgress(session);
      if (!progress) return undefined;
      return createDisplayEvidenceScreen(systemName, userName, progress);
    }
    case "DSPFFD": {
      const context = session.fileContext;
      if (!context) return undefined;
      const file = getPhysicalFile(systemName, context.library, context.name);
      if (!file) return undefined;
      return createDisplayFileFieldDescriptionScreen(systemName, userName, file);
    }
    case "WRKLNK":
      return createWorkObjectLinksScreen(
        systemName,
        userName,
        session.ifsContext?.directory ?? "/",
        session.subfilePage?.WRKLNK ?? 0,
      );
    case "RUNSQL": {
      if (!session.runSqlContext) return undefined;
      const result = executeRunSql(systemName, session.runSqlContext.sql, session);
      return createRunSqlResultScreen(
        systemName,
        session.runSqlContext.sql,
        result,
        session.runSqlContext.page,
      );
    }
    case "WRKSQLSVC":
      return createWorkSqlServicesScreen(systemName, session.subfilePage?.WRKSQLSVC ?? 0);
    case "WRKMBRPDM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const file = session.pdmContext?.sourceFile ?? "QCLSRC";
      return createWorkMemberPdmScreen(
        systemName,
        library,
        file,
        listSourceMembers(systemName, library, file),
        session.subfilePage?.WRKMBRPDM ?? 0,
      );
    }
    case "WRKOBJPDM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const sourceFiles = listSourceFiles(systemName, library).map((name) => ({
        name,
        type: "*FILE",
        text: "Source physical file",
      }));
      const programNames = [
        ...new Set(
          listProgramReferences(systemName)
            .filter((ref) => ref.library.toUpperCase() === library.toUpperCase())
            .map((ref) => ref.program),
        ),
      ].map((name) => ({
        name,
        type: "*PGM",
        text: "Program",
      }));
      return createWorkObjectPdmScreen(
        systemName,
        library,
        [...sourceFiles, ...programNames],
        session.subfilePage?.WRKOBJPDM ?? 0,
      );
    }
    case "DSPPGMREF": {
      const label = session.pdmContext?.programRef ?? "*ALL";
      let refs = listProgramReferences(systemName);
      if (label !== "*ALL") {
        const [library, program] = label.split("/");
        if (library && program) {
          refs = refs.filter(
            (ref) =>
              ref.program.toUpperCase() === program.toUpperCase() &&
              ref.library.toUpperCase() === library.toUpperCase(),
          );
        }
      }
      return createDisplayProgramReferencesScreen(
        systemName,
        refs,
        label,
        session.subfilePage?.DSPPGMREF ?? 0,
      );
    }
    case "DSPPFM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const file = session.pdmContext?.sourceFile ?? "QCLSRC";
      const member = session.pdmContext?.member ?? "NIGHTRUN";
      const source = getSourceMember(systemName, library, file, member);
      if (!source) return undefined;
      return createDisplayPhysicalFileMemberScreen(
        systemName,
        source,
        session.pdmContext?.memberPage ?? 0,
      );
    }
    case "WRKRANGE":
      return createWorkRangeScreen(listActiveRangeSystems(), systemName);
    case "WRKCMPGN":
      return createWorkCampaignsScreen(listCampaignSummaries(userName));
    case "WRKCMPMSN": {
      const campaignId = session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE";
      return createWorkCampaignMissionsScreen(campaignId, getCampaignMissionStatuses(campaignId, userName));
    }
    case "WRKSCORE":
      return createWorkScorebookScreen(listScorebookEntries(userName));
    case "WRKSCN":
      return createWorkScenariosScreen(
        listScenarioPacks().map((pack) => ({ name: pack.name, scenarioId: pack.scenarioId })),
      );
    default:
      return undefined;
  }
}

const REFRESHABLE_SCREENS = new Set<ScreenDefinition["id"]>([
  ...(Object.keys(REFRESH_COMMANDS) as ScreenDefinition["id"][]),
  "DSPFFD",
  "WRKLNK",
  "WRKLIB",
  "DSPLIB",
  "DSPJOBLOG",
  "NETSTAT",
  "NETSTATIFC",
  "NETSTATCNN",
  "NETSTATRTE",
  "RUNSQL",
  "WRKSQLSVC",
  "WRKMBRPDM",
  "WRKOBJPDM",
  "DSPPGMREF",
  "DSPPFM",
  "DSPMSG",
  "DSPMSGINT",
  "WRKPTFGRP",
  "WRKPTF",
  "DSPPTFGRP",
]);

export function supportsRefresh(screenId: ScreenDefinition["id"]): boolean {
  return REFRESHABLE_SCREENS.has(screenId);
}
