import type { ScreenDefinition } from "../screen-runtime/screen.js";
import { APP_NAME } from "../branding.js";
import { createAuditMenuScreen } from "../screen-runtime/screens/auditMenu.js";
import { createMainHubScreen } from "../screen-runtime/screens/mainMenu.js";
import { createDisplayJobLogScreen } from "../screen-runtime/screens/displayJobLog.js";
import { createDisplayJobScreen } from "../screen-runtime/screens/displayJob.js";
import { createDisplayJournalScreen } from "../screen-runtime/screens/displayJournal.js";
import { createDisplaySecurityAuditScreen } from "../screen-runtime/screens/displaySecurityAudit.js";
import {
  createDisplayLogScreen,
  createDisplayMissionScreen,
  createDisplaySecurityAttributesScreen,
  createSecurityAnalysisScreen,
  createWorkJournalScreen,
  createWorkOutputQueueScreen,
} from "../screen-runtime/screens/governanceScreens.js";
import {
  auditSettingsRows,
  createChangeAuditSettingsScreen,
  createChangeJournalReceiverAttributesScreen,
  createChangeJournalScreen,
  createCreateJournalReceiverScreen,
  createDisplayActivityProfileListScreen,
  createDisplayAuditSettingsScreen,
  createDisplayJournalReceiverScreen,
  createWorkAuditSettingsScreen,
  createWorkJournalListScreen,
  createChangeObjectAuditingScreen,
  journalListRows,
} from "../screen-runtime/screens/journalAuditScreens.js";
import {
  createAddAutleScreen,
  createChangeAutlScreen,
  createChangeObjectOwnerScreen,
  createCreateAutlScreen,
  createCreateUserProfileScreen,
  createDeleteUserProfileScreen,
} from "../screen-runtime/screens/authorityOpsScreens.js";
import { createDisplayPtfGroupScreen } from "../screen-runtime/screens/displayPtfGroup.js";
import { createWorkPtfsScreen } from "../screen-runtime/screens/workPtfs.js";
import { createWorkJobsScreen } from "../screen-runtime/screens/workJobs.js";
import {
  createDisplayAuthorityScreen,
  createEditObjectAuthorityScreen,
  createWorkAuthorityScreen,
} from "../screen-runtime/screens/workAuthority.js";
import {
  createDisplaySystemValueDetailScreen,
  createDisplaySystemValueScreen,
  createWorkWithSystemValuesScreen,
} from "../screen-runtime/screens/displaySystemValue.js";
import { createDisplayUserProfileScreen } from "../screen-runtime/screens/displayUserProfile.js";
import { createFindingListScreen } from "../screen-runtime/screens/findingEditor.js";
import { createDisplayEvidenceScreen, createMissionScoreScreen } from "../screen-runtime/screens/missionScreens.js";
import {
  createActivityProfileListScreen,
  createAnalyzeProfileAttributesScreen,
} from "../screen-runtime/screens/analyzeProfileAttributes.js";
import { withMessageLine } from "../screen-runtime/screenRenderer.js";
import { createInfoScreen } from "../screen-runtime/screens/screenHelpers.js";
import { createWorkUserProfilesScreen } from "../screen-runtime/screens/workUserProfiles.js";
import { createWorkObjectsScreen } from "../screen-runtime/screens/workObjects.js";
import { createWorkSpooledFilesScreen } from "../screen-runtime/screens/workSpooledFiles.js";
import { createDisplayLibraryListScreen } from "../screen-runtime/screens/displayLibraryList.js";
import { createDisplayObjectDescriptionScreen } from "../screen-runtime/screens/displayObjectDescription.js";
import { createDisplayFileDescriptionScreen } from "../screen-runtime/screens/displayFileDescription.js";
import {
  createDisplayFileFieldDescriptionScreen,
  createFileFieldDetailScreen,
} from "../screen-runtime/screens/displayFileFieldDescription.js";
import { createWorkObjectLinksScreen } from "../screen-runtime/screens/workObjectLinks.js";
import { resetSubfilePage } from "./subfilePaging.js";
import { createDisplayObjectLinkScreen } from "../screen-runtime/screens/displayObjectLink.js";
import { getPhysicalFile } from "./physicalFileService.js";
import { resolveIfsLinkPath, updateIfsLinkAuthority } from "./ifsLinkService.js";
import { saveLibrary, restoreLibrary } from "./backupService.js";
import { authorityRequiredMessage, sessionHasSpecialAuthority } from "./authorityCheck.js";
import {
  createDisplayObjectAuthorityScreen,
  createObjectNotFoundScreen,
} from "../screen-runtime/screens/displayObjectAuthority.js";
import { createDisplayMessagesForSession, parseMessageAssistLevel } from "../screen-runtime/screens/displayMessagesRouter.js";
import { createDisplayMessagesScreen } from "../screen-runtime/screens/displayMessages.js";
import { createDisplayMessageDetailScreen } from "../screen-runtime/screens/displayMessageDetail.js";
import { createWorkPtfGroupsScreen } from "../screen-runtime/screens/workPtfGroups.js";
import { createDisplayPtfDetailScreen } from "../screen-runtime/screens/displayPtfDetail.js";
import { getPtfDetail, getPtfGroup, listAllPtfs, listPtfGroups, listPtfsForGroup } from "./ptfService.js";
import { createHelpScreen } from "../screen-runtime/screens/helpScreen.js";
import { createDisplayPrivilegedSessionScreen } from "../screen-runtime/screens/displayPrivilegedSession.js";
import { createDisplayServiceToolsConceptScreen } from "../screen-runtime/screens/displayServiceToolsConcept.js";
import {
  createDisplayPhysicalFileMemberScreen,
  createDisplayProgramReferencesScreen,
  createDisplayProgramScreen,
  createStartPdmScreen,
  createWorkMemberPdmScreen,
  createWorkObjectPdmScreen,
} from "../screen-runtime/screens/sourceScreens.js";
import { createWorkSubsystemsScreen } from "../screen-runtime/screens/subsystemScreens.js";
import {
  createWorkDiskStatusScreen,
  createWorkSystemActivityScreen,
  createWorkSystemStatusScreen,
} from "../screen-runtime/screens/systemMonitorScreens.js";
import {
  getMonitorElapsedTime,
  getSystemActivity,
  getSystemStatus,
  listDiskUnits,
} from "./systemMonitorService.js";
import {
  createDisplaySpooledFileScreen,
  createWorkLicenseInfoScreen,
  createWorkMessageQueueScreen,
} from "../screen-runtime/screens/spoolScreens.js";
import { filterCatalogObjects, getCatalogObject } from "./objectCatalogService.js";
import { listSpooledFiles } from "./spoolService.js";
import { listSubsystems } from "./subsystemService.js";
import {
  getSourceMember,
  listProgramReferences,
  listSourceFiles,
  listSourceMembers,
} from "./sourceMemberService.js";
import { createRunSqlResultScreen } from "../screen-runtime/screens/displayRunSql.js";
import { executeRunSql } from "./runSqlService.js";
import { startQshellSession } from "./qshellHandlers.js";
import {
  createJobMenuScreen,
  createSecurityMenuScreen,
  createServiceToolsMenuScreen,
  createSpoolMenuScreen,
} from "../screen-runtime/screens/mainMenu.js";
import { createSecurityStockMenuScreen } from "../screen-runtime/screens/securityStockMenu.js";
import {
  createStockFilesMenuScreen,
  createStockGeneralSystemMenuScreen,
  createStockGoSecurityMenuScreen,
  createStockIbmMainMenuScreen,
  createStockUserTasksMenuScreen,
  IBM_MAIN_MENU_ID,
} from "../screen-runtime/screens/stockIbmMainMenu.js";
import { createChangePasswordScreen } from "../screen-runtime/screens/changePassword.js";
import type { IbmiSession } from "./sessionService.js";
import { authenticateUser } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { getParameter, getQualifiedObject } from "./commandParser.js";
import type { CommandDefinition } from "./commandCatalog.js";
import { catalogCommandHandlers } from "./catalogCommandHandlers.js";
import { showcaseHandlers } from "./showcaseHandlers.js";
import { displayLibraryList, addLibraryEntry, removeLibraryEntry } from "./libraryListService.js";
import {
  getObjectAuthorityDisplay,
  grantObjectAuthority,
  revokeObjectAuthority,
  listAuthorityFindings,
} from "./authorityService.js";
import { getSystemValue, changeSystemValue } from "./systemValueService.js";
import {
  getMessageById,
  getMessageDescription,
  getMessages,
  replyToMessage,
  sendMessage,
} from "./messageService.js";
import {
  changeCurrentLibrary,
  createLibrary as createLibraryEntry,
  getLibraryDescription,
  listLibrariesForWork,
} from "./libraryAdminService.js";
import {
  createDisplayLibraryDescriptionScreen,
  createDisplayLibraryScreen,
  createWorkLibrariesScreen,
  listLibraryObjects,
} from "../screen-runtime/screens/libraryScreens.js";
import { createDisplayMessageDescriptionScreen } from "../screen-runtime/screens/messageScreens.js";
import {
  createChangeNetworkAttributesScreen,
  createCfgTcpMenuScreen,
  createDisplayLinkServerScreen,
  createWorkLinkServersScreen,
} from "../screen-runtime/screens/networkScreens.js";
import { getLinkServer, listLinkServers } from "./networkService.js";
import { submitBatchJob } from "./jobService.js";
import {
  analyzeDefaultPasswords,
  analyzeInactiveProfiles,
  analyzeProfileAttributes,
} from "./securityAnalysisService.js";
import {
  changeUserProfile,
  createUserProfile,
  deleteUserProfile,
  getUserProfile,
  listUserProfiles,
  setActivityProfileExempt,
} from "./userProfileService.js";
import {
  formatOutfilePreview,
  writeAuditJournalOutfile,
  writeUserProfileOutfile,
} from "./outfileService.js";
import {
  endJob as endJobByNumber,
  getJobByNumber,
  holdJob as holdJobByNumber,
  listActiveJobs,
  listJobQueueEntries,
  listJobsBySubsystem,
  listJobsByUser,
  listSubmittedJobs,
  releaseJob as releaseJobByNumber,
  type JobSummary,
} from "./jobService.js";
import {
  createDisplayJobAttributesScreen,
  createDisplaySubsystemScreen,
  createDisplaySystemStatusDetailScreen,
  createWorkJobScreen,
  createWorkSubsystemJobsScreen,
  createWorkUserJobsScreen,
} from "../screen-runtime/screens/jobCommandScreens.js";
import {
  createChangeSecurityAttributesScreen,
  createDisplayUserAuditScreen,
} from "../screen-runtime/screens/securityOpsScreens.js";
import {
  createDisplayAuthorizationListScreen,
  createDisplayOutputQueueScreen,
  createNetStatConnectionScreen,
  createNetStatInterfaceScreen,
  createNetStatMenuScreen,
  createNetStatRouteScreen,
  createNetStatScreen,
  authorizationListRows,
  createWorkAuthorizationListsScreen,
} from "../screen-runtime/screens/spoolNetworkScreens.js";
import { createWorkObjectOwnerScreen } from "../screen-runtime/screens/workObjectOwner.js";
import {
  createEditAuthorizationListScreen,
  ensureAutlEditContext,
} from "../screen-runtime/screens/editAuthorizationList.js";
import { listAuditJournalEntries } from "./auditJournalService.js";
import { getDefaultMission, getMission } from "./missionService.js";
import { getMissionAttempt, listEvidenceRequirements } from "../db/repositories/missionRepository.js";
import {
  ensureMissionAttempt,
  formatScoreMessage,
  getMissionProgress,
  startMissionAttempt,
  submitMission as submitMissionAttempt,
} from "../missions/missionEngine.js";
import { saveFinding } from "../missions/findings.js";
import { exportMissionReport } from "../missions/reportExport.js";
import { DEMO_COMPLETE_MESSAGE } from "../lab/demoTrainer.js";
import { IONGRC_COMPLETE_MESSAGE } from "../lab/iongrcTrainer.js";
import { seedClaims400 } from "../db/seedData.js";
import { getDatabase } from "../db/sqlite.js";
import type { ObjectFilter } from "../db/repositories/objectRepository.js";
import { applyMutation } from "../runtime/runtimeMutationService.js";
import { listStateChanges } from "../db/repositories/runtimeRepository.js";
import { restoreAttemptBaseline } from "../runtime/attemptBaseline.js";
import {
  createDisplayEvidenceDiffScreen,
  mapEntityTypeFilter,
} from "../screen-runtime/screens/displayEvidenceDiff.js";
import { updateSpooledFileStatus, deleteSpooledFile } from "../db/repositories/spoolRepository.js";
import { existsSync, readFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listActiveRangeSystems, selectRangeSystem } from "../range/rangeService.js";
import {
  getCampaignMissionStatuses,
  listCampaignSummaries,
  resolveCampaign,
} from "../range/campaignService.js";
import { loadAllCampaigns, loadPersonas } from "../range/loadRangeRegistry.js";
import { listScorebookEntries } from "../db/repositories/scorebookRepository.js";
import { recordScorebookOnSubmit } from "../range/scorebookService.js";
import { preloadUpcomingCampaignScenarios } from "../range/scenarioLoadService.js";
import { getMissionVariant, loadMissionVariants } from "../range/variantService.js";
import { findControlById, loadControlMappings } from "../runtime/controlMapping.js";
import {
  createWorkCampaignMissionsScreen,
  createWorkCampaignsScreen,
  createWorkRangeScreen,
  createWorkScenariosScreen,
  createWorkScorebookScreen,
  createWorkshopScreen,
} from "../screen-runtime/screens/rangeScreens.js";
import { listExpectedFindings } from "../db/repositories/missionRepository.js";
import { listFindings, updateFindingControl } from "../db/repositories/findingRepository.js";
import { importScenarioPack, listScenarioPacks, packageScenario } from "../range/scenarioPack.js";
import { buildCommandCoverageReport, getCatalogCommand, listCommandsByGroupMenu } from "../catalog/commandCatalogService.js";
import { createCommandGroupMenuScreen } from "../screen-runtime/screens/commandGroupMenu.js";
import {
  createCommandHelpScreen,
  createMessageHelpScreen,
  createTopicHelpScreen,
} from "../screen-runtime/screens/commandHelp.js";
import { createCommandCoverageScreen } from "../screen-runtime/screens/commandCoverage.js";
import { createCommandHistoryScreen } from "../screen-runtime/screens/commandHistoryScreen.js";
import { createWorkSqlServicesScreen } from "../screen-runtime/screens/workSqlServices.js";
import { getLabMessage } from "./messageCatalog.js";

export type MenuRouteResult =
  | { kind: "screen"; screen: ScreenDefinition }
  | { kind: "message"; message: string; command?: string };

export type CommandHandler = (
  session: IbmiSession,
  command: ParsedCommand,
  definition: CommandDefinition,
) => MenuRouteResult;

function resolveJobNumber(command: ParsedCommand): string | undefined {
  const jobParam = getParameter(command, "JOB");
  if (!jobParam) return undefined;
  return jobParam.split("/")[0]?.trim();
}

function resolveWorkObjectFilter(command: ParsedCommand): ObjectFilter {
  const qualified = getQualifiedObject(command, "OBJ");
  const objType = getParameter(command, "OBJTYPE");
  return {
    library: qualified.library,
    object: qualified.object,
    type: objType,
  };
}

function resolveFileReference(
  command: ParsedCommand,
): { library: string; name: string } | { error: string } {
  const qualified = getQualifiedObject(command, "FILE");
  if (!qualified.library || !qualified.object) {
    return { error: "CPF0006 - Qualified file name required." };
  }
  if (qualified.library === "*ALL" || qualified.object === "*ALL") {
    return { error: "CPF0006 - Specific file name required." };
  }
  return { library: qualified.library, name: qualified.object };
}

function resolveIfsPath(command: ParsedCommand): string {
  const raw = getParameter(command, "OBJ") ?? getParameter(command, "PATH") ?? "/";
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
}

function resolveObjectReference(
  command: ParsedCommand,
): { library: string; object: string } | { error: string } {
  const qualified = getQualifiedObject(command, "OBJ");
  if (!qualified.library || !qualified.object) {
    return { error: "CPF0006 - Qualified object name required." };
  }
  if (qualified.library === "*ALL" || qualified.object === "*ALL") {
    return { error: "CPF0006 - Specific object name required." };
  }
  return { library: qualified.library, object: qualified.object };
}

function filterJournalEntriesByType(
  entries: ReturnType<typeof listAuditJournalEntries>,
  entryTypes?: string,
): ReturnType<typeof listAuditJournalEntries> {
  if (!entryTypes || entryTypes === "*ALL") return entries;
  const types = entryTypes.trim().split(/\s+/);
  return entries.filter((entry) => types.includes(entry.entryType));
}

function resolveJournalScreenOptions(
  session: IbmiSession,
  command: ParsedCommand,
): {
  journal: string;
  library: string;
  entryTypes: string;
  entries: ReturnType<typeof listAuditJournalEntries>;
} {
  const jrn = getParameter(command, "JRN");
  let journal = "QAUDJRN";
  let library = "QSYS";
  if (jrn) {
    const slash = jrn.indexOf("/");
    if (slash >= 0) {
      library = jrn.slice(0, slash);
      journal = jrn.slice(slash + 1);
    } else {
      journal = jrn;
    }
  }

  const entryTypes = getParameter(command, "ENTTYP") ?? "*ALL";
  const entries = filterJournalEntriesByType(
    listAuditJournalEntries(session.systemName, {
      userName: getParameter(command, "USER"),
      attemptId: session.missionAttemptId,
    }),
    entryTypes,
  );

  session.journalContext = { entryTypes, entries };
  return { journal, library, entryTypes, entries };
}

function createCampaignScreen(session: IbmiSession): ScreenDefinition {
  const campaigns = loadAllCampaigns();
  const lines = [
    `${APP_NAME} Campaigns`,
    "",
    ...campaigns.flatMap((campaign) => [
      campaign.title,
      campaign.description,
      `Missions: ${campaign.missions.map((m) => m.missionId).join(", ")}`,
      "",
    ]),
    "Use WRKCMPGN to work with campaign progress.",
  ];
  return createInfoScreen("CAMPAIGN", "Campaign", session.systemName, session.userName ?? "", lines);
}

function resolveMissionForSession(session: IbmiSession) {
  const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
  if (attempt) {
    return getMission(attempt.missionId, session.systemName);
  }
  return getDefaultMission(session.systemName);
}

function missionEvidenceHints(missionId: string | undefined): string[] {
  if (!missionId) return [];
  return listEvidenceRequirements(missionId)
    .filter((req) => !req.optional)
    .map((req) => req.description);
}

const handlers: Record<string, CommandHandler> = {
  ...catalogCommandHandlers,
  ...showcaseHandlers,
  signOff: () => ({ kind: "message", message: "SIGNOFF", command: "SIGNOFF" }),

  goMenu: (session, command) => {
    const menu = (getParameter(command, "MENU") ?? command.positionals[0] ?? "AUDIT").toUpperCase();
    const userName = session.userName ?? "QSECOFR";
    switch (menu) {
      case "CAMPAIGN":
        return { kind: "screen", screen: createCampaignScreen(session) };
      case "RANGE":
        return { kind: "screen", screen: createWorkRangeScreen(listActiveRangeSystems(), session.systemName) };
      case "WORKSHOP":
        return { kind: "screen", screen: createWorkshopScreen() };
      case "MAIN":
      case "AUDIT":
        if (menu === "MAIN") {
          session.currentMenu = "MAIN";
          return { kind: "screen", screen: createMainHubScreen(session.systemName, userName) };
        }
        session.currentMenu = "AUDIT";
        return { kind: "screen", screen: createAuditMenuScreen(session.systemName, userName) };
      case "IBMMAIN":
      case "IONGRCMAIN":
        session.currentMenu = IBM_MAIN_MENU_ID;
        return { kind: "screen", screen: createStockIbmMainMenuScreen(session.systemName, userName) };
      case "IBMUSR":
        session.currentMenu = "IBMUSR";
        return { kind: "screen", screen: createStockUserTasksMenuScreen(session.systemName, userName) };
      case "IBMGEN":
        session.currentMenu = "IBMGEN";
        return { kind: "screen", screen: createStockGeneralSystemMenuScreen(session.systemName, userName) };
      case "IBMFL":
        session.currentMenu = "IBMFL";
        return { kind: "screen", screen: createStockFilesMenuScreen(session.systemName, userName) };
      case "IBMSTOCKSEC":
        session.currentMenu = "IBMSTOCKSEC";
        return { kind: "screen", screen: createStockGoSecurityMenuScreen(session.systemName, userName) };
      case "SECURITY":
        session.currentMenu = "SECURITY";
        return { kind: "screen", screen: createSecurityMenuScreen(session.systemName, userName) };
      case "SECSTOCK":
        session.currentMenu = "SECSTOCK";
        return { kind: "screen", screen: createSecurityStockMenuScreen(session.systemName, userName) };
      case "SECTOOLS":
        session.currentMenu = "SECTOOLS";
        return { kind: "screen", screen: createServiceToolsMenuScreen(session.systemName, userName) };
      case "JOB":
        session.currentMenu = "JOB";
        return { kind: "screen", screen: createJobMenuScreen(session.systemName, userName) };
      case "SPL":
        session.currentMenu = "SPL";
        return { kind: "screen", screen: createSpoolMenuScreen(session.systemName, userName) };
      default:
        if (menu.startsWith("CMD")) {
          session.currentMenu = menu;
          return {
            kind: "screen",
            screen: createCommandGroupMenuScreen(menu, session.systemName, listCommandsByGroupMenu(menu)),
          };
        }
        return { kind: "message", message: `CPF2204 - Menu ${menu} not found.` };
    }
  },

  displayPrivilegedSession: (session) => ({
    kind: "screen",
    screen: createDisplayPrivilegedSessionScreen(session),
  }),

  changePassword: (session) => {
    if (!session.userName) {
      return { kind: "message", message: "CPF0006 - Not signed on." };
    }
    return {
      kind: "screen",
      screen: createChangePasswordScreen(session.systemName, session.userName),
    };
  },

  displayServiceToolsConcept: (session) => ({
    kind: "screen",
    screen: createDisplayServiceToolsConceptScreen(session.systemName),
  }),

  displayHelp: (session) => {
    const attempt = ensureMissionAttempt(session);
    return {
      kind: "screen",
      screen: createHelpScreen(session.systemName, session.userName ?? "", {
        missionId: attempt?.missionId,
      }),
    };
  },

  runSql: (session, command) => {
    const sql = getParameter(command, "SQL");
    if (!sql?.trim()) {
      return { kind: "message", message: "CPF0006 - SQL parameter required." };
    }
    const result = executeRunSql(session.systemName, sql, session);
    session.runSqlContext = { sql, page: 0 };
    return {
      kind: "screen",
      screen: createRunSqlResultScreen(session.systemName, sql, result, 0),
    };
  },

  displayLibraryList: (session) => ({
    kind: "screen",
    screen: createDisplayLibraryListScreen(session.systemName, displayLibraryList(session)),
  }),

  addLibraryEntry: (session, command) => {
    const lib = getParameter(command, "LIB");
    if (!lib) {
      return { kind: "message", message: "CPF0006 - Library name required." };
    }
    const before = displayLibraryList(session);
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "ADDLIBLE",
        entityType: "library_list",
        entityId: lib.trim().toUpperCase(),
        before: { user: before.user },
        after: { user: [...before.user, lib.trim().toUpperCase()] },
        evidenceTags: ["library_list_changed"],
        jobLogMessages: [`LCL2001 - Library ${lib.trim().toUpperCase()} added to library list.`],
        coachEventKey: "library_list_changed",
      },
      () => addLibraryEntry(session, lib),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `Library ${lib.trim().toUpperCase()} added to user portion of library list.`,
      command: "ADDLIBLE",
    };
  },

  removeLibraryEntry: (session, command) => {
    const lib = getParameter(command, "LIB");
    if (!lib) {
      return { kind: "message", message: "CPF0006 - Library name required." };
    }
    const before = displayLibraryList(session);
    const afterUser = before.user.filter((entry) => entry !== lib.trim().toUpperCase());
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "RMVLIBLE",
        entityType: "library_list",
        entityId: lib.trim().toUpperCase(),
        before: { user: before.user },
        after: { user: afterUser },
        evidenceTags: ["library_list_changed"],
        jobLogMessages: [`LCL2002 - Library ${lib.trim().toUpperCase()} removed from library list.`],
        coachEventKey: "library_list_changed",
      },
      () => removeLibraryEntry(session, lib),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `Library ${lib.trim().toUpperCase()} removed from user portion of library list.`,
      command: "RMVLIBLE",
    };
  },

  editLibraryList: (session) => ({
    kind: "screen",
    screen: createDisplayLibraryListScreen(session.systemName, displayLibraryList(session), "EDTLIBL"),
  }),

  workWithUserProfiles: (session) => {
    resetSubfilePage(session, "WRKUSRPRF");
    return {
      kind: "screen",
      screen: createWorkUserProfilesScreen(session.systemName, session.userName!),
    };
  },

  displayUserProfile: (session, command) => {
    const output = getParameter(command, "OUTPUT")?.toUpperCase();
    const outfile = getParameter(command, "OUTFILE");
    const user =
      getParameter(command, "USRPRF") ?? command.positionals[0] ?? session.userName ?? "QSECOFR";
    if (output === "*OUTFILE" && outfile) {
      const profiles = listUserProfiles(session.systemName);
      const member = getParameter(command, "OUTMBR") ?? "USERS";
      const location = writeUserProfileOutfile(
        session.systemName,
        outfile,
        member,
        command.raw,
        profiles,
      );
      const preview = formatOutfilePreview(session.systemName, location);
      const qualified = `${location.library}/${location.fileName}`;
      return {
        kind: "message",
        message:
          `CPI9898 - ${profiles.length} records copied to member ${location.memberName} in ${qualified}. ` +
          `Query with RUNSQL: select user_name, status, last_signon from qsys2.outfile_export where outfile_name = '${qualified}'. ` +
          (preview ? `${preview}. ` : "") +
          `Offboarding export — sort by last sign-on for dormant IDs.`,
        command: "DSPUSRPRF",
      };
    }
    return {
      kind: "screen",
      screen: createDisplayUserProfileScreen(session.systemName, user),
    };
  },

  displaySystemValues: (session, command) => {
    const sysval = getParameter(command, "SYSVAL");
    if (sysval) {
      const value = getSystemValue(sysval, session.systemName);
      if (!value) {
        return { kind: "message", message: `CPF1104 - System value ${sysval} not found.` };
      }
      return {
        kind: "screen",
        screen: createDisplaySystemValueDetailScreen(
          session.systemName,
          session.userName!,
          value.name,
          value.value,
          value.description,
        ),
      };
    }
    resetSubfilePage(session, "DSPSYSVAL");
    return {
      kind: "screen",
      screen: createDisplaySystemValueScreen(session.systemName, session.userName!),
    };
  },

  workWithSystemValues: (session) => {
    resetSubfilePage(session, "WRKSYSVAL");
    return {
      kind: "screen",
      screen: createWorkWithSystemValuesScreen(session.systemName, session.userName!),
    };
  },

  workWithObjects: (session, command) => {
    resetSubfilePage(session, "WRKOBJ");
    return {
      kind: "screen",
      screen: createWorkObjectsScreen(
        session.systemName,
        session.userName!,
        resolveWorkObjectFilter(command),
      ),
    };
  },

  displayFileDescription: (session, command) => {
    const ref = resolveFileReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const file = getPhysicalFile(session.systemName, ref.library, ref.name);
    if (!file) {
      return {
        kind: "message",
        message: `CPF2105 - File ${ref.library}/${ref.name} not found.`,
      };
    }
    return {
      kind: "screen",
      screen: createDisplayFileDescriptionScreen(session.systemName, session.userName!, file),
    };
  },

  displayFileFieldDescription: (session, command) => {
    const ref = resolveFileReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const file = getPhysicalFile(session.systemName, ref.library, ref.name);
    if (!file) {
      return {
        kind: "message",
        message: `CPF2105 - File ${ref.library}/${ref.name} not found.`,
      };
    }
    session.fileContext = { library: ref.library, name: ref.name };
    return {
      kind: "screen",
      screen: createDisplayFileFieldDescriptionScreen(session.systemName, session.userName!, file),
    };
  },

  workWithObjectLinks: (session, command) => {
    const directory = resolveIfsPath(command);
    session.ifsContext = { directory };
    resetSubfilePage(session, "WRKLNK");
    return {
      kind: "screen",
      screen: createWorkObjectLinksScreen(session.systemName, session.userName!, directory),
    };
  },

  displayObjectLink: (session, command) => {
    const path = resolveIfsPath(command);
    const link = resolveIfsLinkPath(session.systemName, path);
    if (!link) {
      return { kind: "message", message: `CPF2105 - Object link ${path} not found.` };
    }
    return {
      kind: "screen",
      screen: createDisplayObjectLinkScreen(session.systemName, session.userName!, link, path),
    };
  },

  saveLibrary: (session, command) => {
    if (!sessionHasSpecialAuthority(session, ["*SAVSYS"])) {
      return { kind: "message", message: authorityRequiredMessage(["*SAVSYS"]) };
    }
    const lib = getParameter(command, "LIB");
    if (!lib) {
      return { kind: "message", message: "CPF0006 - Library name required." };
    }
    const result = saveLibrary(session.systemName, lib);
    return {
      kind: "message",
      message: result.message,
      command: result.ok ? "SAVLIB" : undefined,
    };
  },

  restoreLibrary: (session, command) => {
    if (!sessionHasSpecialAuthority(session, ["*SAVSYS"])) {
      return { kind: "message", message: authorityRequiredMessage(["*SAVSYS"]) };
    }
    const lib = getParameter(command, "LIB");
    if (!lib) {
      return { kind: "message", message: "CPF0006 - Library name required." };
    }
    const result = restoreLibrary(session.systemName, lib);
    return {
      kind: "message",
      message: result.message,
      command: result.ok ? "RSTLIB" : undefined,
    };
  },

  displayObjectDescription: (session, command) => {
    const ref = resolveObjectReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const object = getCatalogObject(session.systemName, ref.library, ref.object);
    if (!object) {
      return {
        kind: "message",
        message: `CPF2204 - Object ${ref.library}/${ref.object} not found.`,
      };
    }
    return {
      kind: "screen",
      screen: createDisplayObjectDescriptionScreen(session.systemName, session.userName!, object),
    };
  },

  displayObjectAuthority: (session, command) => {
    const ref = resolveObjectReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const authority = getObjectAuthorityDisplay(
      session.systemName,
      ref.library,
      ref.object,
      getParameter(command, "USER"),
    );
    if (!authority) {
      return {
        kind: "screen",
        screen: createObjectNotFoundScreen(
          session.systemName,
          session.userName!,
          `${ref.library}/${ref.object}`,
        ),
      };
    }
    return {
      kind: "screen",
      screen: createDisplayObjectAuthorityScreen(session.systemName, session.userName!, authority),
    };
  },

  grantObjectAuthority: (session, command) => {
    const ref = resolveObjectReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const user = getParameter(command, "USER") ?? getParameter(command, "USRPRF");
    const aut = getParameter(command, "AUT") ?? getParameter(command, "OBJAUT");
    if (!user || !aut) {
      return { kind: "message", message: "CPF0006 - USER and AUT parameters required." };
    }
    const entityId = `${ref.library}/${ref.object} ${user}`;
    const beforeAuth = getObjectAuthorityDisplay(session.systemName, ref.library, ref.object, user);
    const evidenceTags = ["object_authority_changed"];
    if (user.toUpperCase() === "*PUBLIC") evidenceTags.push("public_authority_remediated");
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "GRTOBJAUT",
        entityType: "object_authority",
        entityId,
        before: { publicAuthority: beforeAuth?.publicAuthority, user, authority: aut },
        after: { publicAuthority: user.toUpperCase() === "*PUBLIC" ? aut : beforeAuth?.publicAuthority, user, authority: aut },
        evidenceTags,
        auditEntryType: "CA",
        auditObjectRef: `${ref.library}/${ref.object}`,
        auditMessage: `Authority ${aut} granted to ${user} for ${ref.library}/${ref.object}.`,
        jobLogMessages: [`LCL2003 - Object authority changed on ${ref.library}/${ref.object}.`],
        coachEventKey: "object_authority_changed",
      },
      () => grantObjectAuthority(session.systemName, ref.library, ref.object, user, aut),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `Authority ${aut} granted to ${user} for ${ref.library}/${ref.object}.`,
      command: "GRTOBJAUT",
    };
  },

  revokeObjectAuthority: (session, command) => {
    const ref = resolveObjectReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const user = getParameter(command, "USER") ?? getParameter(command, "USRPRF");
    if (!user) {
      return { kind: "message", message: "CPF0006 - USER parameter required." };
    }
    const entityId = `${ref.library}/${ref.object} ${user}`;
    const beforeAuth = getObjectAuthorityDisplay(session.systemName, ref.library, ref.object, user);
    const evidenceTags = ["object_authority_changed"];
    if (user.toUpperCase() === "*PUBLIC") evidenceTags.push("public_authority_remediated");
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "RVKOBJAUT",
        entityType: "object_authority",
        entityId,
        before: { publicAuthority: beforeAuth?.publicAuthority, user },
        after: { publicAuthority: user.toUpperCase() === "*PUBLIC" ? "*EXCLUDE" : beforeAuth?.publicAuthority, user },
        evidenceTags,
        auditEntryType: "CA",
        auditObjectRef: `${ref.library}/${ref.object}`,
        auditMessage: `Authority revoked for ${user} on ${ref.library}/${ref.object}.`,
        jobLogMessages: [`LCL2003 - Object authority revoked on ${ref.library}/${ref.object}.`],
        coachEventKey: "object_authority_changed",
      },
      () => revokeObjectAuthority(session.systemName, ref.library, ref.object, user),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `Authority revoked for ${user} on ${ref.library}/${ref.object}.`,
      command: "RVKOBJAUT",
    };
  },

  editObjectAuthority: (session, command) => {
    const ref = resolveObjectReference(command);
    if ("error" in ref) {
      return { kind: "message", message: ref.error };
    }
    const authority = getObjectAuthorityDisplay(session.systemName, ref.library, ref.object);
    if (!authority) {
      return {
        kind: "message",
        message: `CPF2204 - Object ${ref.library}/${ref.object} not found.`,
      };
    }
    return {
      kind: "screen",
      screen: createEditObjectAuthorityScreen(session.systemName, session.userName!, authority),
    };
  },

  displayAuthority: (session, command) => {
    const user = getParameter(command, "USER") ?? getParameter(command, "USRPRF") ?? session.userName!;
    const profile = getUserProfile(user, session.systemName);
    if (!profile) {
      return { kind: "message", message: `CPF2204 - User profile ${user} not found.` };
    }
    return {
      kind: "screen",
      screen: createDisplayAuthorityScreen(session.systemName, user),
    };
  },

  workWithAuthority: (session) => ({
    kind: "screen",
    screen: createWorkAuthorityScreen(session.systemName, listAuthorityFindings(session.systemName)),
  }),

  changeUserProfile: (session, command) => {
    const user = getParameter(command, "USRPRF");
    if (!user) {
      return { kind: "message", message: "CPF0006 - USRPRF parameter required." };
    }
    const normalized = user.trim().toUpperCase();
    const beforeProfile = getUserProfile(normalized, session.systemName);
    if (!beforeProfile) {
      return { kind: "message", message: `CPF2204 - User profile ${normalized} not found.` };
    }
    const status = getParameter(command, "STATUS");
    const spcaut = getParameter(command, "SPCAUT");
    const inlmnu = getParameter(command, "INLMNU");
    const text = getParameter(command, "TEXT");
    const updates = {
      status,
      password: getParameter(command, "PASSWORD"),
      specialAuthorities: spcaut && spcaut !== "*SAME" ? spcaut : undefined,
      initialMenu: inlmnu && inlmnu !== "*SAME" ? inlmnu : undefined,
      text,
    };
    const evidenceTags = ["user_profile_changed"];
    if (status === "*DISABLED" && normalized === "OLDVENDOR") evidenceTags.push("vendor_access_disabled");
    if (status === "*DISABLED" || spcaut === "*NONE") evidenceTags.push("privileged_access_remediated");
    const afterProfile = {
      ...beforeProfile,
      status: updates.status ?? beforeProfile.status,
      specialAuthorities: updates.specialAuthorities ?? beforeProfile.specialAuthorities,
      initialMenu: updates.initialMenu ?? beforeProfile.initialMenu,
      text: updates.text ?? beforeProfile.text,
    };
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "CHGUSRPRF",
        entityType: "user_profile",
        entityId: normalized,
        before: { ...beforeProfile },
        after: afterProfile,
        evidenceTags,
        auditEntryType: "CP",
        auditObjectRef: normalized,
        auditMessage: `User profile ${normalized} changed by ${session.userName ?? "QSECOFR"}.`,
        jobLogMessages: [
          `CPI9896 - User profile ${normalized} changed.`,
          "CPI0000 - Command CHGUSRPRF completed.",
        ],
        coachEventKey: "user_profile_changed",
      },
      () => changeUserProfile(session.systemName, normalized, updates),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "screen",
      screen: withMessageLine(
        createDisplayUserProfileScreen(session.systemName, normalized),
        "CPI0000 - Command CHGUSRPRF completed.",
      ),
    };
  },

  createUserProfileHandler: (session, command) => {
    const user = getParameter(command, "USRPRF");
    if (!user) {
      return {
        kind: "screen",
        screen: createCreateUserProfileScreen(session.systemName),
      };
    }
    const normalized = user.trim().toUpperCase();
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "CRTUSRPRF",
        entityType: "user_profile",
        entityId: normalized,
        before: {},
        after: { userName: normalized },
        evidenceTags: ["user_profile_created"],
        auditEntryType: "UA",
        auditObjectRef: normalized,
        auditMessage: `User profile ${normalized} created.`,
        jobLogMessages: ["CPI0000 - Command CRTUSRPRF completed."],
        coachEventKey: "user_profile_changed",
      },
      () => createUserProfile(session.systemName, normalized, getParameter(command, "PASSWORD")),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "screen",
      screen: withMessageLine(
        createCreateUserProfileScreen(session.systemName, normalized),
        `CPI0000 - User profile ${normalized} created.`,
      ),
    };
  },

  deleteUserProfileHandler: (session, command) => {
    const user = getParameter(command, "USRPRF");
    if (!user) {
      return {
        kind: "screen",
        screen: createDeleteUserProfileScreen(session.systemName),
      };
    }
    const normalized = user.trim().toUpperCase();
    const beforeProfile = getUserProfile(normalized, session.systemName);
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "DLTUSRPRF",
        entityType: "user_profile",
        entityId: normalized,
        before: beforeProfile ?? {},
        after: {},
        evidenceTags: ["user_profile_deleted"],
        auditEntryType: "UA",
        auditObjectRef: normalized,
        auditMessage: `User profile ${normalized} deleted.`,
        jobLogMessages: ["CPI0000 - Command DLTUSRPRF completed."],
        coachEventKey: "user_profile_changed",
      },
      () => deleteUserProfile(session.systemName, normalized),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `CPI0000 - User profile ${normalized} deleted.`,
    };
  },

  analyzeDefaultPasswords: (session) => ({
    kind: "screen",
    screen: createSecurityAnalysisScreen(
      "ANZDFTPWD",
      "Analyze Default Passwords",
      session.systemName,
      session.userName!,
      analyzeDefaultPasswords(session.systemName),
    ),
  }),

  analyzeProfileAttributes: (session, command) => {
    const inactRaw = getParameter(command, "INACT");
    if (inactRaw) {
      const inactDays = Number.parseInt(inactRaw.replace(/[()]/g, ""), 10) || 90;
      const analysis = analyzeInactiveProfiles(session.systemName, inactDays);
      const header = [
        `INACT threshold . . . . . . . . : ${inactDays} days`,
        `Candidates for disable . . . . : ${analysis.candidates.length}`,
        analysis.exempt.length > 0 ? `Exempt profiles . . . . . . . : ${analysis.exempt.join(", ")}` : "",
        "",
      ].filter(Boolean);
      return {
        kind: "screen",
        screen: createAnalyzeProfileAttributesScreen(
          session.systemName,
          "Analyze Profile Attributes — Inactive Accounts",
          header,
          analysis.findings,
        ),
      };
    }
    return {
      kind: "screen",
      screen: createAnalyzeProfileAttributesScreen(
        session.systemName,
        "Analyze Profile Attributes",
        [],
        analyzeProfileAttributes(session.systemName),
      ),
    };
  },

  changeActivityProfileList: (session, command) => {
    const user = getParameter(command, "USRPRF");
    const status = getParameter(command, "STATUS")?.toUpperCase();
    if (!user) {
      return { kind: "message", message: "CPF0006 - USRPRF parameter required." };
    }
    if (status !== "*ACTIVE") {
      return {
        kind: "message",
        message: "CPF0006 - Lab supports CHGACTPRFL STATUS(*ACTIVE) to exempt profiles from inactive sweeps.",
      };
    }
    const normalized = user.trim().toUpperCase();
    const beforeProfile = getUserProfile(normalized, session.systemName);
    if (!beforeProfile) {
      return { kind: "message", message: `CPF2204 - User profile ${normalized} not found.` };
    }
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "CHGACTPRFL",
        entityType: "user_profile",
        entityId: normalized,
        before: { ...beforeProfile, activityProfileExempt: beforeProfile.activityProfileExempt ?? false },
        after: { ...beforeProfile, activityProfileExempt: true },
        evidenceTags: ["activity_profile_exempt"],
        auditEntryType: "CP",
        auditObjectRef: normalized,
        auditMessage: `Activity profile list updated for ${normalized}.`,
        jobLogMessages: [
          `CPI9897 - Profile ${normalized} set to *ACTIVE on activity profile list.`,
          "CPI0000 - Command CHGACTPRFL completed.",
        ],
      },
      () => setActivityProfileExempt(session.systemName, normalized, true),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "screen",
      screen: withMessageLine(
        createActivityProfileListScreen(session.systemName, normalized),
        `CPI9897 - Profile ${normalized} set to *ACTIVE on activity profile list.`,
      ),
    };
  },

  displaySecurityAttributes: (session) => ({
    kind: "screen",
    screen: createDisplaySecurityAttributesScreen(session.systemName, session.userName!),
  }),

  changeSystemValue: (session, command) => {
    const sysval = getParameter(command, "SYSVAL");
    const value = getParameter(command, "VALUE");
    if (!sysval || value === undefined) {
      return { kind: "message", message: "CPF0006 - SYSVAL and VALUE parameters required." };
    }
    const before = getSystemValue(sysval, session.systemName);
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "CHGSYSVAL",
        entityType: "system_value",
        entityId: sysval.trim().toUpperCase(),
        before: { value: before?.value ?? "*UNKNOWN" },
        after: { value },
        evidenceTags: ["system_value_changed", "security_configuration_changed"],
        auditEntryType: "SV",
        auditObjectRef: sysval.trim().toUpperCase(),
        auditMessage: `System value ${sysval} changed from ${before?.value ?? "*UNKNOWN"} to ${value}.`,
        jobLogMessages: [
          "CPI0000 - Command CHGSYSVAL completed.",
          `LCL2005 - System value ${sysval} changed to ${value}.`,
        ],
        coachEventKey: "system_value_changed",
      },
      () => changeSystemValue(sysval, value, session.systemName),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `System value ${sysval} changed to ${value}.`,
      command: "CHGSYSVAL",
    };
  },

  displaySecurityAudit: (session) => {
    const entries = listAuditJournalEntries(session.systemName, {
      entryType: "AF",
      attemptId: session.missionAttemptId,
    });
    session.journalContext = { entryTypes: "AF", entries };
    resetSubfilePage(session, "DSPSECAUD");
    const page = session.subfilePage?.DSPSECAUD ?? 0;
    return {
      kind: "screen",
      screen: createDisplaySecurityAuditScreen(session.systemName, entries, page),
    };
  },

  displayAuditJournalEntries: (session, command) => {
    const options = resolveJournalScreenOptions(session, command);
    resetSubfilePage(session, "DSPAUDJRNE");
    return {
      kind: "screen",
      screen: createDisplayJournalScreen(
        session.systemName,
        session.userName!,
        options,
        "DSPAUDJRNE",
        "Display Audit Journal Entries",
      ),
    };
  },

  workWithJournal: (session) => {
    const rows = journalListRows();
    session.catalogWorkContext = { screenId: "WRKJRN", rows };
    return {
      kind: "screen",
      screen: createWorkJournalListScreen(session.systemName, rows),
    };
  },

  workWithJournalAttributes: (session) => ({
    kind: "screen",
    screen: createWorkJournalScreen("WRKJRNA", session.systemName, session.userName!),
  }),

  changeJournal: (session, command) => {
    const qualified = getQualifiedObject(command, "JRN");
    const journal = qualified ? `${qualified.library}/${qualified.object}` : "QSYS/QAUDJRN";
    return {
      kind: "screen",
      screen: createChangeJournalScreen(session.systemName, journal),
    };
  },

  createJournalReceiver: (session, command) => {
    const qualified = getQualifiedObject(command, "JRN");
    const journal = qualified ? `${qualified.library}/${qualified.object}` : "QSYS/QAUDJRN";
    return {
      kind: "screen",
      screen: createCreateJournalReceiverScreen(session.systemName, journal),
    };
  },

  changeJournalReceiverAttributes: (session, command) => {
    const qualified = getQualifiedObject(command, "JRN");
    const journal = qualified ? `${qualified.library}/${qualified.object}` : "QSYS/QAUDJRN";
    const receiver = getParameter(command, "RCV") ?? "QAUDJRN";
    return {
      kind: "screen",
      screen: createChangeJournalReceiverAttributesScreen(session.systemName, journal, receiver),
    };
  },

  displayJournalReceiver: (session, command) => {
    const qualified = getQualifiedObject(command, "JRN");
    const journal = qualified ? `${qualified.library}/${qualified.object}` : "QSYS/QAUDJRN";
    const receiver = getParameter(command, "RCV") ?? "QAUDJRN";
    return {
      kind: "screen",
      screen: createDisplayJournalReceiverScreen(session.systemName, journal, receiver),
    };
  },

  displayAuditSettings: (session) => ({
    kind: "screen",
    screen: createDisplayAuditSettingsScreen(session.systemName),
  }),

  changeAuditSettings: (session) => ({
    kind: "screen",
    screen: createChangeAuditSettingsScreen(session.systemName),
  }),

  changeObjectAuditing: (session, command, definition) => {
    const qualified = getQualifiedObject(command, "OBJ");
    const aud = getParameter(command, "AUD");
    if (qualified?.library && qualified.object && aud) {
      return catalogCommandHandlers.catalogChange(session, command, definition);
    }
    const objectRef = qualified ? `${qualified.library}/${qualified.object}` : (getParameter(command, "OBJ") ?? "");
    return {
      kind: "screen",
      screen: createChangeObjectAuditingScreen(
        session.systemName,
        session.userName ?? "QSECOFR",
        objectRef,
        getParameter(command, "OBJTYPE") ?? "*FILE",
        aud ?? "*ALL",
      ),
    };
  },

  workWithAuditSettings: (session) => {
    const rows = auditSettingsRows(session.systemName);
    session.catalogWorkContext = { screenId: "WRKAUD", rows };
    return {
      kind: "screen",
      screen: createWorkAuditSettingsScreen(session.systemName, rows),
    };
  },

  displayActivityProfileList: (session) => ({
    kind: "screen",
    screen: createDisplayActivityProfileListScreen(session.systemName),
  }),

  changeObjectOwner: (session, command) => {
    const qualified = getQualifiedObject(command, "OBJ");
    const obj = qualified ? `${qualified.library}/${qualified.object}` : "PAYROLL/PAYMST";
    const objType = getParameter(command, "OBJTYPE") ?? "*FILE";
    const newOwn = getParameter(command, "NEWOWN") ?? "PAYADMIN";
    return {
      kind: "screen",
      screen: createChangeObjectOwnerScreen(session.systemName, obj, objType, newOwn),
    };
  },

  createAuthorizationList: (session, command) => {
    const autl = getParameter(command, "AUTL") ?? command.positionals[0] ?? "NEWAUTL";
    const text = getParameter(command, "TEXT") ?? "Audit remediation list";
    return {
      kind: "screen",
      screen: createCreateAutlScreen(session.systemName, autl, text),
    };
  },

  changeAuthorizationList: (session, command) => {
    const autl = getParameter(command, "AUTL") ?? command.positionals[0] ?? "PAYROLL";
    const text = getParameter(command, "TEXT") ?? "Payroll object authority list";
    return {
      kind: "screen",
      screen: createChangeAutlScreen(session.systemName, autl, text),
    };
  },

  addAuthorizationListEntry: (session, command) => {
    const autl = getParameter(command, "AUTL") ?? "PAYROLL";
    const user = getParameter(command, "USER") ?? "APCLERK";
    const authority = getParameter(command, "AUT") ?? getParameter(command, "AUTHORITY") ?? "*USE";
    return {
      kind: "screen",
      screen: createAddAutleScreen(session.systemName, autl, user, authority),
    };
  },

  workPtfs: (session) => {
    session.subfilePage = { ...session.subfilePage, WRKPTF: 0 };
    return {
      kind: "screen",
      screen: createWorkPtfsScreen(session.systemName, listAllPtfs(session.systemName), 0),
    };
  },

  displayPtfGroup: (session, command) => {
    const groupId =
      getParameter(command, "PTFID") ??
      getParameter(command, "GRP") ??
      getParameter(command, "GROUP") ??
      "SF99740";
    const group = getPtfGroup(groupId);
    if (!group) {
      return { kind: "message", message: `CPF0006 - PTF group ${groupId.toUpperCase()} not found.` };
    }
    session.ptfContext = { groupId: group.groupId };
    session.subfilePage = { ...session.subfilePage, DSPPTFGRP: 0 };
    return {
      kind: "screen",
      screen: createDisplayPtfGroupScreen(
        session.systemName,
        group,
        listPtfsForGroup(group.groupId),
        0,
      ),
    };
  },

  displayLog: (session) => ({
    kind: "screen",
    screen: createDisplayLogScreen(session.systemName, session.userName!),
  }),

  workSubmittedJobs: (session) => ({
    kind: "screen",
    screen: createWorkJobsScreen(
      session.systemName,
      "Work with Submitted Jobs",
      "WRKSBMJOB",
      listSubmittedJobs(session.systemName),
    ),
  }),

  workJobQueue: (session) => ({
    kind: "screen",
    screen: createWorkJobsScreen(
      session.systemName,
      "Work with Job Queue",
      "WRKJOBQ",
      listJobQueueEntries(session.systemName),
    ),
  }),

  workOutputQueue: (session) => ({
    kind: "screen",
    screen: createWorkOutputQueueScreen(session.systemName),
  }),

  displayPtf: (session, command) => {
    const ptfId =
      getParameter(command, "PTF") ??
      getParameter(command, "PTFID") ??
      getParameter(command, "SELECT");
    if (!ptfId || ptfId === "*ALL") {
      return {
        kind: "message",
        message: "CPF0006 - PTF identifier required. Example: DSPPTF PTF(SI76195) SELECT(SI76195).",
      };
    }
    const detail = getPtfDetail(ptfId);
    if (!detail) {
      return { kind: "message", message: `CPF0006 - PTF ${ptfId.toUpperCase()} not found.` };
    }
    return {
      kind: "screen",
      screen: createDisplayPtfDetailScreen(session.systemName, detail),
    };
  },

  workPtfGroups: (session) => {
    session.subfilePage = { ...session.subfilePage, WRKPTFGRP: 0 };
    return {
      kind: "screen",
      screen: createWorkPtfGroupsScreen(
        session.systemName,
        listPtfGroups(session.systemName),
        0,
      ),
    };
  },

  workProducts: (session) => ({
    kind: "screen",
    screen: createInfoScreen("WRKPRD", "Work with Products", session.systemName, session.userName!, [
      "5770-SS1   IBM i Operating System",
      "5770-SS1 Option  7   IBM i Access Family",
      "5770-SS1 Option 33   IBM i Portable Application Solutions Environment",
      "Use WRKPTFGRP to review installed PTF groups.",
    ]),
  }),

  displayMission: (session) => {
    ensureMissionAttempt(session);
    const mission = resolveMissionForSession(session);
    if (!mission) {
      return { kind: "message", message: "CPF0006 - No mission defined for this system." };
    }
    const progress = getMissionProgress(session);
    return {
      kind: "screen",
      screen: createDisplayMissionScreen(
        session.systemName,
        session.userName!,
        mission,
        progress?.evidenceCoverage,
        missionEvidenceHints(mission.id),
      ),
    };
  },

  displayEvidence: (session) => {
    ensureMissionAttempt(session);
    const progress = getMissionProgress(session);
    if (!progress) {
      return { kind: "message", message: "CPF0006 - No active mission attempt." };
    }
    return {
      kind: "screen",
      screen: createDisplayEvidenceScreen(session.systemName, session.userName!, progress),
    };
  },

  submitMission: (session) => {
    if (session.userName?.trim().toUpperCase() === "DEMO") {
      return { kind: "message", message: DEMO_COMPLETE_MESSAGE };
    }
    if (session.userName?.trim().toUpperCase() === "IONGRC") {
      return { kind: "message", message: IONGRC_COMPLETE_MESSAGE };
    }
    const result = submitMissionAttempt(session);
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    const attempt = getMissionAttempt(session.missionAttemptId!);
    const progress = getMissionProgress(session);
    const exportPaths = exportMissionReport(session.missionAttemptId!, result.breakdown);
    if (attempt) {
      recordScorebookOnSubmit({
        attemptId: attempt.id,
        systemName: session.systemName,
        missionId: attempt.missionId,
        userName: attempt.userName,
        startedAt: attempt.startedAt,
        campaignId: session.campaignId,
        personaId: session.personaId,
        guidanceMode: session.guidanceMode,
        variantId: session.variantId,
        breakdown: result.breakdown,
        evidenceCoveragePercent: progress?.evidenceCoverage.score ?? 0,
        reportPath: exportPaths.markdownPath,
      });
      const campaignId = session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE";
      setImmediate(() => {
        try {
          preloadUpcomingCampaignScenarios(campaignId, attempt.userName);
        } catch {
          /* background preload is best-effort */
        }
      });
    }
    const lines = [
      ...formatScoreMessage(result.breakdown).split(" | "),
      `Report exported: ${exportPaths.markdownPath}`,
      `JSON export: ${exportPaths.jsonPath}`,
    ];
    return {
      kind: "screen",
      screen: createMissionScoreScreen(session.systemName, lines),
    };
  },

  displayJournal: (session, command) => {
    const options = resolveJournalScreenOptions(session, command);
    resetSubfilePage(session, "DSPJRN");
    return {
      kind: "screen",
      screen: createDisplayJournalScreen(session.systemName, session.userName!, options),
    };
  },

  displayJob: (session) => ({
    kind: "screen",
    screen: createDisplayJobScreen(session.systemName, session.userName!, session),
  }),

  workActiveJobs: (session) => {
    resetSubfilePage(session, "WRKACTJOB");
    return {
      kind: "screen",
      screen: createWorkJobsScreen(
        session.systemName,
        "Work with Active Jobs",
        "WRKACTJOB",
        listActiveJobs(session.systemName),
        session.subfilePage?.WRKACTJOB ?? 0,
      ),
    };
  },

  workDiskStatus: (session) => ({
    kind: "screen",
    screen: createWorkDiskStatusScreen(
      session.systemName,
      listDiskUnits(session.systemName),
      getMonitorElapsedTime(session.monitorStatsResetAt),
    ),
  }),

  workSystemStatus: (session) => ({
    kind: "screen",
    screen: createWorkSystemStatusScreen(
      session.systemName,
      getSystemStatus(session.systemName, session.monitorStatsResetAt),
    ),
  }),

  workSystemActivity: (session) => ({
    kind: "screen",
    screen: createWorkSystemActivityScreen(session.systemName, getSystemActivity(session.systemName)),
  }),

  displaySystemStatus: (session) => ({
    kind: "screen",
    screen: createDisplaySystemStatusDetailScreen(session.systemName, getSystemStatus(session.systemName)),
  }),

  workWithJob: (session, command) => {
    const jobNumber = resolveJobNumber(command);
    const jobs = jobNumber
      ? ([getJobByNumber(session.systemName, jobNumber)].filter(Boolean) as JobSummary[])
      : listJobsByUser(session.systemName, session.userName ?? "AUDIT");
    session.jobFilterContext = { userName: session.userName };
    return {
      kind: "screen",
      screen: createWorkJobScreen(session.systemName, jobs),
    };
  },

  workSubsystemJobs: (session, command) => {
    const subsystem = getParameter(command, "SBS") ?? "QINTER";
    session.jobFilterContext = { subsystem };
    return {
      kind: "screen",
      screen: createWorkSubsystemJobsScreen(
        session.systemName,
        subsystem,
        listJobsBySubsystem(session.systemName, subsystem),
      ),
    };
  },

  workUserJobs: (session, command) => {
    const userName = getParameter(command, "USER") ?? session.userName ?? "AUDIT";
    session.jobFilterContext = { userName };
    return {
      kind: "screen",
      screen: createWorkUserJobsScreen(session.systemName, userName, listJobsByUser(session.systemName, userName)),
    };
  },

  displayJobAttributes: (session, command) => {
    const jobNumber = resolveJobNumber(command);
    const job =
      (jobNumber ? getJobByNumber(session.systemName, jobNumber) : undefined) ??
      listJobsByUser(session.systemName, session.userName ?? "AUDIT")[0];
    if (!job) {
      return { kind: "message", message: "CPF1336 - Job not found." };
    }
    return {
      kind: "screen",
      screen: createDisplayJobAttributesScreen(session.systemName, job),
    };
  },

  displaySubsystemDescription: (session, command) => {
    const subsystemName = getParameter(command, "SBS") ?? "QINTER";
    const subsystem = listSubsystems(session.systemName).find(
      (entry) => entry.name.toUpperCase() === subsystemName.toUpperCase(),
    );
    if (!subsystem) {
      return { kind: "message", message: `CPF1016 - Subsystem ${subsystemName} not found.` };
    }
    return {
      kind: "screen",
      screen: createDisplaySubsystemScreen(session.systemName, subsystem),
    };
  },

  holdJob: (session, command) => {
    const jobNumber = resolveJobNumber(command);
    if (!jobNumber) return { kind: "message", message: "CPF0006 - JOB parameter required." };
    const result = holdJobByNumber(session.systemName, jobNumber);
    return { kind: "message", message: result.message, command: "HLDJOB" };
  },

  releaseJob: (session, command) => {
    const jobNumber = resolveJobNumber(command);
    if (!jobNumber) return { kind: "message", message: "CPF0006 - JOB parameter required." };
    const result = releaseJobByNumber(session.systemName, jobNumber);
    return { kind: "message", message: result.message, command: "RLSJOB" };
  },

  endJob: (session, command) => {
    const jobNumber = resolveJobNumber(command);
    if (!jobNumber) return { kind: "message", message: "CPF0006 - JOB parameter required." };
    const result = endJobByNumber(session.systemName, jobNumber);
    return { kind: "message", message: result.message, command: "ENDJOB" };
  },

  displayUserAudit: (session, command) => {
    const targetUser = getParameter(command, "USRPRF") ?? session.userName ?? "AUDIT";
    return {
      kind: "screen",
      screen: createDisplayUserAuditScreen(session.systemName, session.userName!, targetUser),
    };
  },

  changeSecurityAttributes: (session, command) => {
    const qsecurity = getParameter(command, "QSECURITY");
    const qaudctl = getParameter(command, "QAUDCTL");
    if (!qsecurity && !qaudctl) {
      return {
        kind: "screen",
        screen: createChangeSecurityAttributesScreen(session.systemName, session.userName!),
      };
    }
    const updates: Array<{ sysval: string; value: string }> = [];
    if (qsecurity) updates.push({ sysval: "QSECURITY", value: qsecurity });
    if (qaudctl) updates.push({ sysval: "QAUDCTL", value: qaudctl });
    for (const { sysval, value } of updates) {
      const before = getSystemValue(sysval, session.systemName);
      const result = applyMutation(
        session,
        {
          commandText: command.raw,
          mutationType: "CHGSECA",
          entityType: "system_value",
          entityId: sysval,
          before: before ?? {},
          after: { value },
          evidenceTags: ["security_attributes_changed"],
          auditEntryType: "SV",
          auditObjectRef: sysval,
          auditMessage: `Security attribute ${sysval} changed via CHGSECA.`,
          jobLogMessages: ["CPI0000 - Command CHGSECA completed."],
          coachEventKey: "system_value_changed",
        },
        () => changeSystemValue(sysval, value, session.systemName),
      );
      if (!result.ok) {
        return { kind: "message", message: result.message };
      }
    }
    return { kind: "message", message: "CHGSECA completed. Security attributes updated.", command: "CHGSECA" };
  },

  saveSecurityData: (session, command) => {
    let savedFile = "";
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "SAVSECDTA",
        entityType: "user_profile",
        entityId: session.systemName,
        before: {},
        after: { snapshot: "security" },
        evidenceTags: ["security_save"],
        auditEntryType: "AF",
        auditObjectRef: session.systemName,
        auditMessage: "Security data saved.",
        jobLogMessages: ["CPI0000 - Command SAVSECDTA completed."],
        coachEventKey: "security_save",
      },
      () => {
        const dir = join(process.cwd(), "data", "security-saves");
        mkdirSync(dir, { recursive: true });
        const stamp = Date.now();
        savedFile = join(dir, `${session.systemName}-${stamp}.json`);
        const profiles = listUserProfiles(session.systemName);
        writeFileSync(
          savedFile,
          JSON.stringify({ system: session.systemName, profiles, savedAt: new Date().toISOString() }, null, 2),
        );
        return { ok: true as const };
      },
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `SAVSECDTA completed. Security data saved to ${savedFile}.`,
      command: "SAVSECDTA",
    };
  },

  restoreSecurityData: (session, command) => {
    const dir = join(process.cwd(), "data", "security-saves");
    if (!existsSync(dir)) {
      return { kind: "message", message: "CPF2204 - No security save files found." };
    }
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    const latest = files[files.length - 1];
    if (!latest) {
      return { kind: "message", message: "CPF2204 - No security save files found." };
    }
    const restorePath = join(dir, latest);
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "RSTSECDTA",
        entityType: "user_profile",
        entityId: session.systemName,
        before: {},
        after: { restoredFrom: latest },
        evidenceTags: ["security_restore"],
        auditEntryType: "AF",
        auditObjectRef: session.systemName,
        auditMessage: `Security data restored from ${latest}.`,
        jobLogMessages: ["CPI0000 - Command RSTSECDTA completed."],
        coachEventKey: "security_restore",
      },
      () => ({ ok: true as const }),
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return {
      kind: "message",
      message: `RSTSECDTA completed. Restored from ${restorePath} (lab snapshot replay).`,
      command: "RSTSECDTA",
    };
  },

  displayOutputQueue: (session, command) => {
    const queue = getParameter(command, "OUTQ") ?? "QPRINT";
    return {
      kind: "screen",
      screen: createDisplayOutputQueueScreen(session.systemName, queue),
    };
  },

  displayNetStat: (session, command) => {
    const option = getParameter(command, "OPTION")?.toUpperCase() ?? "*SELECT";
    if (option === "*CNN" || option === "CNN") {
      return { kind: "screen", screen: createNetStatConnectionScreen(session.systemName) };
    }
    if (option === "*IFC" || option === "IFC") {
      return { kind: "screen", screen: createNetStatInterfaceScreen(session.systemName) };
    }
    if (option === "*RTE" || option === "RTE") {
      return { kind: "screen", screen: createNetStatRouteScreen(session.systemName) };
    }
    return { kind: "screen", screen: createNetStatMenuScreen(session.systemName) };
  },

  configureTcpIp: (session) => ({
    kind: "screen",
    screen: createCfgTcpMenuScreen(session.systemName),
  }),

  changeNetworkAttributes: (session, command, definition) => {
    if (Object.keys(command.parameters).length === 0) {
      return { kind: "screen", screen: createChangeNetworkAttributesScreen(session.systemName) };
    }
    return catalogCommandHandlers.catalogChange(session, command, definition);
  },

  displayAuthorizationList: (session, command) => {
    const listName = getParameter(command, "AUTL") ?? "PAYROLL";
    return {
      kind: "screen",
      screen: createDisplayAuthorizationListScreen(session.systemName, listName),
    };
  },

  workAuthorizationLists: (session) => {
    const rows = authorizationListRows();
    session.catalogWorkContext = { screenId: "WRKAUTL", rows };
    return {
      kind: "screen",
      screen: createWorkAuthorizationListsScreen(session.systemName),
    };
  },

  copyAuditJournalEntries: (session, command) => {
    const options = resolveJournalScreenOptions(session, command);
    const outfile = getParameter(command, "OUTFILE") ?? "QGPL/AUDJRN";
    const outmbr = getParameter(command, "OUTMBR") ?? "AUDJRN";
    const enttyp = options.entryTypes === "*ALL" ? "all types" : options.entryTypes;
    const location = writeAuditJournalOutfile(
      session.systemName,
      outfile,
      outmbr,
      command.raw,
      options.entries,
    );
    const preview = formatOutfilePreview(session.systemName, location);
    const qualified = `${location.library}/${location.fileName}`;
    return {
      kind: "message",
      message:
        `CPI9898 - ${options.entries.length} audit journal entries (${enttyp}) copied to member ${location.memberName} in ${qualified}. ` +
        `Query with RUNSQL: select entry_time, user_name, entry_type from qsys2.outfile_export where outfile_name = '${qualified}'. ` +
        (preview ? `${preview}. ` : "") +
        `COSO/CC7 monitoring extract — pair with DSPAUDJRNE ENTTYP(AF PW) before export.`,
      command: "CPYAUDJRNE",
    };
  },

  workWithObjectOwner: (session, command) => {
    const rawProfile = getParameter(command, "USRPRF") ?? command.positionals[0];
    const userProfile =
      !rawProfile || rawProfile.toUpperCase() === "*CURRENT"
        ? (session.userName ?? "QSECOFR")
        : rawProfile.toUpperCase();
    const objType = getParameter(command, "OBJTYPE")?.toUpperCase() ?? "*ALL";
    session.objOwnContext = { userProfile, objType };
    resetSubfilePage(session, "WRKOBJOWN");
    return {
      kind: "screen",
      screen: createWorkObjectOwnerScreen(
        session.systemName,
        session.objOwnContext,
        session.subfilePage?.WRKOBJOWN ?? 0,
      ),
    };
  },

  editAuthorizationList: (session, command) => {
    const listName = getParameter(command, "AUTL") ?? command.positionals[0] ?? "PAYROLL";
    const context = ensureAutlEditContext(session, listName);
    return {
      kind: "screen",
      screen: createEditAuthorizationListScreen(
        session.systemName,
        context.listName,
        context.members,
      ),
    };
  },

  workSpooledFiles: (session) => {
    resetSubfilePage(session, "WRKSPLF");
    return {
      kind: "screen",
      screen: createWorkSpooledFilesScreen(session.systemName, session.userName!),
    };
  },

  displayJobLog: (session) => {
    session.jobLogShowAll = false;
    return {
      kind: "screen",
      screen: createDisplayJobLogScreen(
        session.systemName,
        session.userName!,
        session.missionAttemptId,
        session,
      ),
    };
  },

  displayMessages: (session, command) => {
    const queue = getParameter(command, "MSGQ") ?? command.positionals[0] ?? "QSYSOPR";
    const astLevel = parseMessageAssistLevel(command);
    session.messageContext = { queueName: queue, astLevel, infoPage: 0 };
    session.subfilePage = { ...session.subfilePage, DSPMSGINT: 0 };
    return {
      kind: "screen",
      screen: createDisplayMessagesForSession(session, queue),
    };
  },

  workWithFindings: (session) => {
    const attempt = ensureMissionAttempt(session);
    const findings = attempt ? listFindings(attempt.id) : [];
    return {
      kind: "screen",
      screen: createFindingListScreen(session.systemName, session.userName!, findings),
    };
  },

  restoreLabPackage: (session) => {
    seedClaims400(getDatabase());
    session.missionAttemptId = undefined;
    session.journalContext = undefined;
    session.fileContext = undefined;
    session.ifsContext = undefined;
    return {
      kind: "message",
      message: "RSTLABPKG completed. CLAIMS400 scenario restored. Sign off and sign on again to restart mission.",
      command: "RSTLABPKG",
    };
  },

  runBuild: () => ({
    kind: "message",
    message: "RUNBUILD completed. Synthetic object catalog refreshed.",
    command: "RUNBUILD",
  }),

  displayBuildInstructions: (session) => ({
    kind: "screen",
    screen: createInfoScreen(
      "DSPBLD",
      "Build Instructions",
      session.systemName,
      session.userName!,
      [
        "Display build instructions for CLAIMS400 lab package.",
        "Use RUNBUILD to compile synthetic catalog artifacts.",
      ],
    ),
  }),

  startPdm: (session, command) => {
    const library = getParameter(command, "LIB") ?? session.pdmContext?.library ?? "CLAIMS400";
    session.pdmContext = { library };
    return {
      kind: "screen",
      screen: createStartPdmScreen(session.systemName, session.userName ?? "AUDIT", library),
    };
  },

  workObjectPdm: (session, command) => {
    const qualified = getQualifiedObject(command, "OBJ");
    const library =
      getParameter(command, "LIB") ?? qualified?.library ?? session.pdmContext?.library ?? "CLAIMS400";
    session.pdmContext = { ...session.pdmContext, library };
    session.subfilePage = { ...session.subfilePage, WRKOBJPDM: 0 };
    const sourceFiles = listSourceFiles(session.systemName, library).map((name) => ({
      name,
      type: "*FILE",
      text: "Source physical file",
    }));
    const programNames = [
      ...new Set(
        listProgramReferences(session.systemName)
          .filter((ref) => ref.library.toUpperCase() === library.toUpperCase())
          .map((ref) => ref.program),
      ),
    ].map((name) => ({
      name,
      type: "*PGM",
      text: "Program",
    }));
    return {
      kind: "screen",
      screen: createWorkObjectPdmScreen(session.systemName, library, [...sourceFiles, ...programNames]),
    };
  },

  workMemberPdm: (session, command) => {
    const qualified = getQualifiedObject(command, "FILE");
    const library = qualified?.library ?? session.pdmContext?.library ?? "CLAIMS400";
    const file = qualified?.object ?? session.pdmContext?.sourceFile ?? "QCLSRC";
    session.pdmContext = { library, sourceFile: file };
    session.subfilePage = { ...session.subfilePage, WRKMBRPDM: 0 };
    const members = listSourceMembers(session.systemName, library, file);
    if (!members.length) {
      return {
        kind: "message",
        message: `CPF2105 - No members found in ${library}/${file}. Try WRKMBRPDM FILE(CLAIMS400/QCLSRC).`,
      };
    }
    return {
      kind: "screen",
      screen: createWorkMemberPdmScreen(session.systemName, library, file, members),
    };
  },

  displayPhysicalFileMember: (session, command) => {
    const qualified = getQualifiedObject(command, "FILE");
    const library = qualified?.library ?? session.pdmContext?.library ?? "CLAIMS400";
    const file = qualified?.object ?? session.pdmContext?.sourceFile ?? "QCLSRC";
    const member = getParameter(command, "MBR") ?? session.pdmContext?.member ?? "NIGHTRUN";
    const source = getSourceMember(session.systemName, library, file, member);
    if (!source) {
      return { kind: "message", message: `CPF2105 - Member ${member} not found in ${library}/${file}.` };
    }
    session.pdmContext = {
      library,
      sourceFile: file,
      member,
      memberPage: 0,
    };
    return {
      kind: "screen",
      screen: createDisplayPhysicalFileMemberScreen(session.systemName, source, 0),
    };
  },

  displayProgram: (session, command) => {
    const qualified = getQualifiedObject(command, "PGM") ?? getQualifiedObject(command, "OBJ");
    const library = qualified?.library ?? "CLAIMS400";
    const program = qualified?.object ?? "CLMMAINT";
    const object = getCatalogObject(session.systemName, library, program);
    return {
      kind: "screen",
      screen: createDisplayProgramScreen(
        session.systemName,
        program,
        library,
        object?.text ?? "Program object",
      ),
    };
  },

  displayProgramReferences: (session, command) => {
    const qualified = getQualifiedObject(command, "PGM") ?? getQualifiedObject(command, "OBJ");
    const library = qualified?.library ?? session.pdmContext?.library ?? "CLAIMS400";
    const program = qualified?.object;
    let refs = listProgramReferences(session.systemName);
    if (program) {
      refs = refs.filter(
        (ref) =>
          ref.program.toUpperCase() === program.toUpperCase() &&
          ref.library.toUpperCase() === library.toUpperCase(),
      );
    }
    const programLabel = program ? `${library}/${program}` : "*ALL";
    session.pdmContext = { ...session.pdmContext, library, programRef: programLabel };
    session.subfilePage = { ...session.subfilePage, DSPPGMREF: 0 };
    return {
      kind: "screen",
      screen: createDisplayProgramReferencesScreen(session.systemName, refs, programLabel),
    };
  },

  workSubsystems: (session) => ({
    kind: "screen",
    screen: createWorkSubsystemsScreen(session.systemName, listSubsystems(session.systemName)),
  }),

  displaySpooledFile: (session, command) => {
    const fileName = getParameter(command, "FILE") ?? "QAUDRPT";
    const spool = listSpooledFiles(session.systemName).find(
      (entry) => entry.fileName.toUpperCase() === fileName.toUpperCase(),
    );
    if (!spool) {
      return { kind: "message", message: `CPF2105 - Spooled file ${fileName} not found.` };
    }
    return {
      kind: "screen",
      screen: createDisplaySpooledFileScreen(
        session.systemName,
        spool.fileName,
        spool.userName,
        spool.spoolNumber,
        spool.status,
      ),
    };
  },

  workMessageQueue: (session, command) => {
    const queue = getParameter(command, "MSGQ") ?? "QSYSOPR";
    return {
      kind: "screen",
      screen: createWorkMessageQueueScreen(
        session.systemName,
        queue,
        getMessages(queue, session).length,
      ),
    };
  },

  workLibraries: (session) => {
    resetSubfilePage(session, "WRKLIB");
    return {
      kind: "screen",
      screen: createWorkLibrariesScreen(
        session.systemName,
        listLibrariesForWork(session),
        session.subfilePage?.WRKLIB ?? 0,
      ),
    };
  },

  displayLibrary: (session, command) => {
    const libName = getParameter(command, "LIB");
    if (!libName) return { kind: "message", message: "CPF0006 - LIB parameter required." };
    const library = getLibraryDescription(session.systemName, libName);
    if (!library) return { kind: "message", message: `CPF2105 - Library ${libName} not found.` };
    session.libraryContext = {
      name: library.name,
      type: library.type,
      text: library.text,
      objectCount: 0,
    };
    resetSubfilePage(session, "DSPLIB");
    const objects = listLibraryObjects(session.systemName, library.name);
    return {
      kind: "screen",
      screen: createDisplayLibraryScreen(
        session.systemName,
        library,
        objects,
        session.subfilePage?.DSPLIB ?? 0,
      ),
    };
  },

  displayLibraryDescription: (session, command) => {
    const libName = getParameter(command, "LIB");
    if (!libName) return { kind: "message", message: "CPF0006 - LIB parameter required." };
    const library = getLibraryDescription(session.systemName, libName);
    if (!library) return { kind: "message", message: `CPF2105 - Library ${libName} not found.` };
    return { kind: "screen", screen: createDisplayLibraryDescriptionScreen(session.systemName, library) };
  },

  changeCurrentLibrary: (session, command) => {
    const libName = getParameter(command, "CURLIB") ?? getParameter(command, "LIB");
    if (!libName) return { kind: "message", message: "CPF0006 - CURLIB parameter required." };
    const result = changeCurrentLibrary(session, libName);
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `CPC2112 - Current library changed to ${libName.toUpperCase()}.` };
  },

  createLibrary: (session, command) => {
    const libName = getParameter(command, "LIB");
    if (!libName) return { kind: "message", message: "CPF0006 - LIB parameter required." };
    const result = createLibraryEntry(session.systemName, libName, getParameter(command, "TEXT") ?? "Lab library");
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `CPC7301 - Library ${libName.toUpperCase()} created.` };
  },

  submitJob: (session, command) => {
    const cmd = getParameter(command, "CMD");
    if (!cmd) return { kind: "message", message: "CPF0006 - CMD parameter required." };
    const result = submitBatchJob(session, {
      cmd,
      jobName: getParameter(command, "JOB"),
      jobd: getParameter(command, "JOBD"),
      jobq: getParameter(command, "JOBQ"),
    });
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: result.message };
  },

  sendMessage: (session, command) => {
    const text = getParameter(command, "MSG");
    const queue = getParameter(command, "TOMSGQ") ?? "QSYSOPR";
    if (!text) return { kind: "message", message: "CPF0006 - MSG parameter required." };
    sendMessage(session, queue, text);
    return { kind: "message", message: `CPC1221 - Message sent to message queue ${queue}.` };
  },

  sendProgramMessage: (session, command) => {
    const text = getParameter(command, "MSG");
    if (!text) return { kind: "message", message: "CPF0006 - MSG parameter required." };
    sendMessage(session, "QSYSOPR", text, "CPF9898");
    return { kind: "message", message: "CPC1221 - Program message sent." };
  },

  displayMessageDescription: (session, command) => {
    const messageId = getParameter(command, "MSGID");
    if (!messageId) return { kind: "message", message: "CPF0006 - MSGID parameter required." };
    const description = getMessageDescription(messageId);
    return {
      kind: "screen",
      screen: createDisplayMessageDescriptionScreen(
        session.systemName,
        description.messageId,
        description.text,
      ),
    };
  },

  changeSpooledFileAttributes: (session, command) => {
    const fileName = getParameter(command, "FILE");
    const status = getParameter(command, "SPLFSTAT") ?? getParameter(command, "OUTQ") ?? "READY";
    if (!fileName) return { kind: "message", message: "CPF0006 - FILE parameter required." };
    const spool = listSpooledFiles(session.systemName).find(
      (entry) => entry.fileName.toUpperCase() === fileName.toUpperCase(),
    );
    const userName =
      getParameter(command, "JOB")?.split("/")[1] ?? spool?.userName ?? session.userName ?? "QSECOFR";
    const result = updateSpooledFileStatus(session.systemName, fileName, userName, status);
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `CPC1221 - Spooled file ${fileName} attributes changed.` };
  },

  workLinkServers: (session) => ({
    kind: "screen",
    screen: createWorkLinkServersScreen(session.systemName, listLinkServers()),
  }),

  displayLinkServer: (session, command) => {
    const serverName = getParameter(command, "SERVER");
    if (!serverName) return { kind: "message", message: "CPF0006 - SERVER parameter required." };
    const server = getLinkServer(serverName);
    if (!server) return { kind: "message", message: `CPF2105 - Server ${serverName} not found.` };
    return { kind: "screen", screen: createDisplayLinkServerScreen(session.systemName, server) };
  },

  workLicenseInfo: (session) => ({
    kind: "screen",
    screen: createWorkLicenseInfoScreen(session.systemName),
  }),

  startSql: () => ({
    kind: "message",
    message:
      "STRSQL is not interactive in this lab. Use RUNSQL SQL('select user_name from qsys2.user_info').",
    command: "RUNSQL",
  }),

  startQshell: (session, command) => {
    const cmd = getParameter(command, "CMD");
    return startQshellSession(session, cmd);
  },

  qsh: (session, command) => {
    const cmd = getParameter(command, "CMD");
    if (!cmd?.trim()) {
      return { kind: "message", message: "CPF0006 - CMD parameter required for QSH." };
    }
    return startQshellSession(session, cmd);
  },

  changeIfsAuthority: (session, command) => {
    const path = getParameter(command, "OBJ");
    const dataAut = getParameter(command, "DTAAUT");
    if (!path || !dataAut) {
      return { kind: "message", message: "CPF0006 - OBJ and DTAAUT parameters required." };
    }
    const existing = resolveIfsLinkPath(session.systemName, path);
    if (!existing) {
      return { kind: "message", message: `CPF2204 - IFS object ${path} not found.` };
    }
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "CHGAUT",
        entityType: "ifs_authority",
        entityId: path,
        before: { dataAuthority: existing.dataAuthority },
        after: { dataAuthority: dataAut },
        evidenceTags: ["ifs_authority_changed", "ifs_exposure_remediated"],
        auditEntryType: "CA",
        auditObjectRef: path,
        auditMessage: `IFS authority changed on ${path}.`,
        jobLogMessages: [`LCL2006 - IFS data authority changed on ${path}.`],
        coachEventKey: "ifs_authority_changed",
      },
      () => {
        const update = updateIfsLinkAuthority(session.systemName, path, dataAut);
        if (!update.ok) return update;
        return { ok: true as const };
      },
    );
    if (!result.ok) {
      return { kind: "message", message: result.message };
    }
    return { kind: "message", message: `Authority changed for ${path}.`, command: "CHGAUT" };
  },

  holdSpooledFile: (session, command) => {
    const file = getParameter(command, "FILE") ?? getParameter(command, "SPLF");
    const user = getParameter(command, "JOB")?.split("/")[1] ?? session.userName ?? "AUDIT";
    if (!file) return { kind: "message", message: "CPF0006 - FILE parameter required." };
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "HLDSPLE",
        entityType: "spooled_file",
        entityId: file,
        before: { status: "READY" },
        after: { status: "HELD" },
        evidenceTags: ["spool_output"],
        jobLogMessages: [`LCL2007 - Spooled file ${file} held.`],
        coachEventKey: "spool_changed",
      },
      () => {
        const update = updateSpooledFileStatus(session.systemName, file, user, "HELD");
        return update.ok ? { ok: true as const } : { ok: false as const, message: update.message };
      },
    );
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `Spooled file ${file} held.`, command: "HLDSPLE" };
  },

  releaseSpooledFile: (session, command) => {
    const file = getParameter(command, "FILE") ?? getParameter(command, "SPLF");
    const user = session.userName ?? "AUDIT";
    if (!file) return { kind: "message", message: "CPF0006 - FILE parameter required." };
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "RLSSPLF",
        entityType: "spooled_file",
        entityId: file,
        before: { status: "HELD" },
        after: { status: "READY" },
        evidenceTags: ["spool_output"],
        jobLogMessages: [`LCL2008 - Spooled file ${file} released.`],
        coachEventKey: "spool_changed",
      },
      () => {
        const update = updateSpooledFileStatus(session.systemName, file, user, "READY");
        return update.ok ? { ok: true as const } : { ok: false as const, message: update.message };
      },
    );
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `Spooled file ${file} released.`, command: "RLSSPLF" };
  },

  deleteSpooledFile: (session, command) => {
    const file = getParameter(command, "FILE") ?? getParameter(command, "SPLF");
    const user = session.userName ?? "AUDIT";
    if (!file) return { kind: "message", message: "CPF0006 - FILE parameter required." };
    const result = applyMutation(
      session,
      {
        commandText: command.raw,
        mutationType: "DLTSPLF",
        entityType: "spooled_file",
        entityId: file,
        before: { status: "READY" },
        after: { status: "DELETED" },
        evidenceTags: ["spool_output"],
        auditEntryType: "DO",
        auditObjectRef: file,
        auditMessage: `Spooled file ${file} deleted.`,
        jobLogMessages: [`LCL2009 - Spooled file ${file} deleted.`],
        coachEventKey: "spool_changed",
      },
      () => {
        const update = deleteSpooledFile(session.systemName, file, user);
        return update.ok ? { ok: true as const } : { ok: false as const, message: update.message };
      },
    );
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: `Spooled file ${file} deleted.`, command: "DLTSPLF" };
  },

  displayEvidenceDiff: (session, command) => {
    const attempt = ensureMissionAttempt(session);
    if (!attempt) {
      return { kind: "message", message: "CPF0006 - No active mission attempt." };
    }
    const filterType = getParameter(command, "TYPE") ?? "*ALL";
    const entityFilter = mapEntityTypeFilter(filterType);
    const changes = listStateChanges(attempt.id, entityFilter);
    return {
      kind: "screen",
      screen: createDisplayEvidenceDiffScreen(
        session.systemName,
        session.userName!,
        attempt.missionId,
        filterType,
        changes,
      ),
    };
  },

  resetLab: (session, command) => {
    const confirm = (getParameter(command, "CONFIRM") ?? "*NO").toUpperCase();
    if (confirm !== "*YES") {
      return {
        kind: "message",
        message: "CPF0006 - RESETLAB requires CONFIRM(*YES).",
        command: "RESETLAB",
      };
    }
    const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
    if (!attempt) {
      return { kind: "message", message: "CPF0006 - No active mission attempt to reset." };
    }
    const restored = restoreAttemptBaseline(attempt.id, session.systemName, session);
    if (!restored.ok) {
      return { kind: "message", message: restored.message };
    }
    session.currentMenu = "AUDIT";
    return {
      kind: "screen",
      screen: createAuditMenuScreen(session.systemName, session.userName!),
    };
  },

  goCampaign: (session) => ({
    kind: "screen",
    screen: createCampaignScreen(session),
  }),

  workRange: (session) => ({
    kind: "screen",
    screen: createWorkRangeScreen(listActiveRangeSystems(), session.systemName),
  }),

  selectRangeSystem: (session, command) => {
    const system = getParameter(command, "SYSTEM") ?? getParameter(command, "SYS") ?? command.positionals[0];
    if (!system) {
      return { kind: "screen", screen: createWorkRangeScreen(listActiveRangeSystems(), session.systemName) };
    }
    const result = selectRangeSystem(session, system);
    if (!result.ok) return { kind: "message", message: result.message };
    return {
      kind: "screen",
      screen: createWorkRangeScreen(
        listActiveRangeSystems(),
        session.systemName,
        `System changed to ${session.systemName}.`,
      ),
    };
  },

  workCampaigns: (session) => ({
    kind: "screen",
    screen: createWorkCampaignsScreen(listCampaignSummaries(session.userName ?? "AUDIT")),
  }),

  workCampaignMissions: (session, command) => {
    const campaignKey =
      getParameter(command, "CAMPAIGN") ?? session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE";
    const campaign = resolveCampaign(campaignKey);
    if (!campaign) return { kind: "message", message: `CPF2204 - Campaign ${campaignKey} not found.` };
    session.campaignId = campaign.campaignId;
    return {
      kind: "screen",
      screen: createWorkCampaignMissionsScreen(
        campaign.campaignId,
        getCampaignMissionStatuses(campaign.campaignId, session.userName ?? "AUDIT"),
      ),
    };
  },

  startCampaignMission: (session, command) => {
    const missionId = getParameter(command, "MISSION") ?? command.positionals[0];
    if (!missionId) return { kind: "message", message: "CPF0006 - MISSION parameter required." };
    const campaign = resolveCampaign(session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE");
    const entry = campaign?.missions.find((m) => m.missionId === missionId.toUpperCase());
    if (!entry) return { kind: "message", message: `CPF2204 - Mission ${missionId} not in campaign.` };
    const system = listActiveRangeSystems().find((s) => s.systemId === entry.systemId);
    if (system) selectRangeSystem(session, system.systemName);
    const attempt = startMissionAttempt(session, entry.missionId);
    if (!attempt) return { kind: "message", message: `CPF2204 - Unable to start mission ${missionId}.` };
    return {
      kind: "message",
      message: `Mission ${entry.missionId} started on ${session.systemName}.`,
      command: "STRMSN",
    };
  },

  workScorebook: (session) => ({
    kind: "screen",
    screen: createWorkScorebookScreen(listScorebookEntries(session.userName)),
  }),

  changePersona: (session, command) => {
    const raw = (getParameter(command, "PERSONA") ?? "AUDITOR").toLowerCase().replace(/-/g, "_");
    const aliases: Record<string, string> = { admin: "operator", student: "auditor" };
    const resolved = aliases[raw] ?? (raw === "blue_team" ? "blue_team" : raw.replace(/_mode$/, ""));
    if (!loadPersonas().some((p) => p.personaId === resolved)) {
      return { kind: "message", message: `CPF2204 - Persona ${raw} not found.` };
    }
    session.personaId = resolved;
    return { kind: "message", message: `Persona changed to ${resolved}.`, command: "CHGPERS" };
  },

  displayPersona: (session) => ({
    kind: "screen",
    screen: createInfoScreen("DSPPERS", "Display Persona", session.systemName, session.userName ?? "", [
      `Persona . . . . . . . . . . . : ${session.personaId ?? "auditor"}`,
      `Guidance mode . . . . . . . . : ${session.guidanceMode ?? "coach"}`,
      `Campaign . . . . . . . . . . : ${session.campaignId ?? "*NONE"}`,
      `Variant . . . . . . . . . . . : ${session.variantId ?? "*NONE"}`,
    ]),
  }),

  changeGuidanceMode: (session, command) => {
    const raw = (getParameter(command, "MODE") ?? "COACH").toLowerCase();
    const mode = raw === "exam" || raw === "tutorial" ? "assessment" : raw;
    const allowed = new Set(["coach", "assessment", "expert", "workshop"]);
    if (!allowed.has(mode)) {
      return { kind: "message", message: "CPF0006 - MODE must be COACH, ASSESSMENT, EXPERT, or WORKSHOP." };
    }
    session.guidanceMode = mode;
    return { kind: "message", message: `Guidance mode changed to ${mode}.`, command: "CHGMODE" };
  },

  displayGuidanceMode: (session) => ({
    kind: "screen",
    screen: createInfoScreen("DSPMODE", "Display Guidance Mode", session.systemName, session.userName ?? "", [
      `Guidance mode . . . . . . . . : ${session.guidanceMode ?? "coach"}`,
      "Coach mode provides hints; assessment mode minimizes coach support.",
    ]),
  }),

  changeVariant: (session, command) => {
    const variantId = getParameter(command, "VARIANT");
    if (!variantId) return { kind: "message", message: "CPF0006 - VARIANT parameter required." };
    const scenarioId = session.scenarioId ?? session.systemName.toLowerCase();
    const variant = getMissionVariant(scenarioId, variantId.toUpperCase());
    if (!variant) return { kind: "message", message: `CPF2204 - Variant ${variantId} not found.` };
    session.variantId = variant.variantId;
    session.missionAttemptId = undefined;
    startMissionAttempt(session, variant.missionId);
    return { kind: "message", message: `Variant ${variant.variantId} selected.`, command: "CHGVARIANT" };
  },

  displayVariant: (session) => {
    const scenarioId = session.scenarioId ?? "claims400";
    const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
    const missionId = attempt?.missionId ?? "CLAIMS-001";
    const variants = loadMissionVariants(scenarioId, missionId);
    return {
      kind: "screen",
      screen: createInfoScreen(
        "DSPVARIANT",
        "Display Variant",
        session.systemName,
        session.userName ?? "",
        [
          `Current variant . . . . . . . : ${session.variantId ?? "*DEFAULT"}`,
          "",
          ...variants.map((v) => `${v.variantId} — ${v.title}`),
        ],
      ),
    };
  },

  workVariants: (session) => {
    const scenarioId = session.scenarioId ?? "claims400";
    const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
    const missionId = attempt?.missionId ?? "CLAIMS-001";
    const variants = loadMissionVariants(scenarioId, missionId);
    return {
      kind: "screen",
      screen: createInfoScreen(
        "WRKVARIANT",
        "Work with Variants",
        session.systemName,
        session.userName ?? "",
        variants.map((v) => `${v.variantId} — ${v.title}`),
      ),
    };
  },

  workControls: (session) => ({
    kind: "screen",
    screen: createInfoScreen(
      "WRKCTRL",
      "Work with Controls",
      session.systemName,
      session.userName ?? "",
      loadControlMappings().map((c) => `${c.id} — ${c.title}`),
    ),
  }),

  displayControl: (session, command) => {
    const controlId = getParameter(command, "CTRL") ?? command.positionals[0];
    const control = loadControlMappings().find((c) => c.id === controlId?.toUpperCase());
    if (!control) return { kind: "message", message: `CPF2204 - Control ${controlId} not found.` };
    return {
      kind: "screen",
      screen: createInfoScreen("DSPCTRL", "Display Control", session.systemName, session.userName ?? "", [
        `Control . . . . . . . . . . . : ${control.id}`,
        control.title,
        `Framework . . . . . . . . . . : ${control.framework}`,
        control.family ? `Family . . . . . . . . . . . : ${control.family}` : "",
        control.description ?? "",
      ]),
    };
  },

  generateReport: (session, command) => {
    const type = (getParameter(command, "TYPE") ?? "*MISSION").toUpperCase();
    if (type === "*CAMPAIGN" || type === "CAMPAIGN") {
      const campaignId = session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE";
      const userName = session.userName ?? "AUDIT";
      const campaign = resolveCampaign(campaignId);
      const dir = join(
        process.cwd(),
        "data",
        "reports",
        "campaigns",
        `${campaignId}-${userName}-${Date.now()}`,
      );
      mkdirSync(dir, { recursive: true });
      const missions = getCampaignMissionStatuses(campaignId, userName);
      const scorebook = listScorebookEntries(userName);
      const controls = loadControlMappings();

      const missionScores = missions.map((mission) => ({
        missionId: mission.entry.missionId,
        systemName: mission.systemName,
        status: mission.status,
        score: mission.score,
      }));

      writeFileSync(
        join(dir, "campaign_report.md"),
        [
          `# Campaign Report: ${campaign?.title ?? campaignId}`,
          "",
          `Persona: ${session.personaId ?? "auditor"}`,
          `Guidance mode: ${session.guidanceMode ?? "coach"}`,
          "",
          "## Mission status",
          ...missions.map((m) => `- ${m.entry.missionId} (${m.systemName}): ${m.status} ${m.score ?? ""}`),
          "",
          "## Limitations",
          "- Synthetic training environment only.",
          "- Not a compliance or audit opinion.",
        ].join("\n"),
      );
      writeFileSync(
        join(dir, "campaign_report.json"),
        JSON.stringify(
          {
            campaignId,
            title: campaign?.title,
            personaId: session.personaId ?? "auditor",
            guidanceMode: session.guidanceMode ?? "coach",
            missions: missionScores,
          },
          null,
          2,
        ),
      );
      writeFileSync(join(dir, "mission_scores.json"), JSON.stringify(missionScores, null, 2));
      writeFileSync(
        join(dir, "evidence_packet_index.json"),
        JSON.stringify(
          scorebook
            .filter((entry) => entry.evidencePacketPath)
            .map((entry) => ({
              missionId: entry.missionId,
              path: entry.evidencePacketPath,
            })),
          null,
          2,
        ),
      );
      writeFileSync(
        join(dir, "control_coverage.json"),
        JSON.stringify(
          controls.slice(0, 12).map((control) => ({ controlId: control.id, title: control.title })),
          null,
          2,
        ),
      );
      return { kind: "message", message: `Campaign report exported: ${dir}`, command: "GENRPT" };
    }
    if (type === "*EXEC" || type === "EXEC") {
      const dir = join(process.cwd(), "data", "reports", "executive");
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `exec-${session.systemName}-${Date.now()}.md`);
      const findings = session.missionAttemptId ? listFindings(session.missionAttemptId) : [];
      writeFileSync(
        path,
        [
          "# Executive Summary",
          "",
          `System reviewed: ${session.systemName}`,
          `Campaign: ${session.campaignId ?? "*NONE"}`,
          `Persona: ${session.personaId ?? "auditor"}`,
          "",
          "## Top findings",
          ...(findings.length
            ? findings.map((finding) => `- ${finding.title} (${finding.severity})`)
            : ["- No findings recorded yet."]),
          "",
          "## Evidence gaps",
          "- Review mission evidence coverage before management sign-off.",
          "",
          "## Limitations",
          "- Synthetic IBM i training lab; not production evidence.",
        ].join("\n"),
      );
      return { kind: "message", message: `Executive report exported: ${path}`, command: "GENRPT" };
    }
    if (type === "*PRIV" || type === "PRIV") {
      const userName = session.userName ?? "QSECOFR";
      const dir = join(process.cwd(), "data", "reports", "privileged");
      mkdirSync(dir, { recursive: true });
      const stamp = Date.now();
      const path = join(dir, `${session.systemName}-${userName}-${stamp}.md`);
      const lines = [
        `# Privileged Operator Report — ${session.systemName}`,
        "",
        "| Field | Value |",
        "|-------|-------|",
        `| **System** | ${session.systemName} |`,
        `| **User** | ${userName} |`,
        `| **Lane** | ${session.lane ?? "operator"} |`,
        `| **Generated** | ${new Date().toISOString()} |`,
        "",
        "## Command transcript",
        "",
        ...session.commandHistory.map((cmd, index) => `${index + 1}. \`${cmd}\``),
        "",
        "## Limitations",
        "",
        "- Synthetic training environment only.",
        "- Not production evidence. Not affiliated with IBM.",
      ];
      writeFileSync(path, lines.join("\n"));
      return { kind: "message", message: `Privileged report exported: ${path}`, command: "GENRPT" };
    }
    return { kind: "message", message: "CPF0006 - Use GENRPT TYPE(*CAMPAIGN), TYPE(*EXEC), or TYPE(*PRIV)." };
  },

  mapControlToFinding: (session, command) => {
    const findingRef = getParameter(command, "FINDING") ?? command.positionals[0];
    const controlId = getParameter(command, "CTRL") ?? command.positionals[1];
    if (!findingRef || !controlId) {
      return { kind: "message", message: "CPF0006 - MAPCTRL requires FINDING(n) and CTRL(id)." };
    }
    const attempt = ensureMissionAttempt(session);
    if (!attempt) return { kind: "message", message: "CPF0006 - No active mission attempt." };
    const control = findControlById(controlId);
    if (!control) return { kind: "message", message: `CPF2204 - Control ${controlId} not found.` };

    const findings = listFindings(attempt.id);
    const index = Number.parseInt(findingRef, 10) - 1;
    if (Number.isNaN(index) || index < 0 || index >= findings.length) {
      return { kind: "message", message: `CPF2204 - Finding ${findingRef} not found.` };
    }
    updateFindingControl(findings[index]!.id, control.id);
    return {
      kind: "message",
      message: `Finding ${findingRef} mapped to control ${control.id}.`,
      command: "MAPCTRL",
    };
  },

  workScenarioPacks: () => ({
    kind: "screen",
    screen: createWorkScenariosScreen(
      listScenarioPacks().map((pack) => ({ name: pack.name, scenarioId: pack.scenarioId })),
    ),
  }),

  saveScenarioPackage: (session, command) => {
    const scenarioKey = (getParameter(command, "SCENARIO") ?? session.systemName).toLowerCase();
    const toStmf = getParameter(command, "TOSTMF");
    const result = packageScenario(scenarioKey, toStmf ?? undefined);
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: result.message, command: "SAVSCNPKG" };
  },

  restoreScenarioPackage: (session, command) => {
    const packagePath = getParameter(command, "PACKAGE") ?? command.positionals[0];
    if (!packagePath) {
      return { kind: "message", message: "CPF0006 - PACKAGE parameter required." };
    }
    const force = (getParameter(command, "FORCE") ?? "").toUpperCase() === "*YES";
    const result = importScenarioPack(packagePath, { force });
    if (!result.ok) return { kind: "message", message: result.message };
    return { kind: "message", message: result.message, command: "RSTSCNPKG" };
  },

  displayCommandHelp: (session, command) => {
    const cmdName = (getParameter(command, "CMD") ?? command.positionals[0] ?? session.promptContext?.commandName)?.toUpperCase();
    if (!cmdName) return { kind: "message", message: "CPF0006 - CMD parameter required." };
    const catalogCmd = getCatalogCommand(cmdName);
    if (!catalogCmd) return { kind: "message", message: `CPF0001 - Command ${cmdName} not found.` };
    return {
      kind: "screen",
      screen: createCommandHelpScreen(catalogCmd, session.systemName),
    };
  },

  displayMessageHelp: (session, command) => {
    const msgId = (getParameter(command, "MSGID") ?? command.positionals[0] ?? "").toUpperCase();
    if (!msgId) return { kind: "message", message: "CPF0006 - MSGID parameter required." };
    const message = getLabMessage(msgId);
    if (!message) return { kind: "message", message: `CPF2204 - Message ${msgId} not found.` };
    return { kind: "screen", screen: createMessageHelpScreen(message, session.systemName) };
  },

  displayCommandCoverage: (session) => ({
    kind: "screen",
    screen: createCommandCoverageScreen(session.systemName, buildCommandCoverageReport()),
  }),

  displayCommandHistory: (session) => ({
    kind: "screen",
    screen: createCommandHistoryScreen(session.systemName, session.commandHistory),
  }),

  displayTopicHelp: (session, command) => {
    const topic = getParameter(command, "TOPIC") ?? command.positionals[0] ?? "SPECIAL_AUTHORITY";
    return {
      kind: "screen",
      screen: createTopicHelpScreen(topic, session.systemName),
    };
  },

  workSqlServices: (session) => {
    session.currentMenu = "WRKSQLSVC";
    return { kind: "screen", screen: createWorkSqlServicesScreen(session.systemName) };
  },

  displayScenarioPackage: (session, command) => {
    const packagePath = getParameter(command, "PACKAGE") ?? command.positionals[0];
    const packs = listScenarioPacks();
    const normalized = packagePath?.toLowerCase().replace(/\.lclpack$/, "");
    const pack = packagePath
      ? packs.find(
          (entry) =>
            entry.path.toLowerCase().includes(packagePath.toLowerCase()) ||
            entry.name.toLowerCase().includes(packagePath.toLowerCase()) ||
            (normalized && entry.scenarioId?.toLowerCase() === normalized),
        )
      : packs[0];
    if (!pack) return { kind: "message", message: "CPF2204 - Scenario package not found." };
    return {
      kind: "screen",
      screen: createInfoScreen("DSPSCN", "Display Scenario Package", session.systemName, session.userName ?? "", [
        `Package . . . . . . . . . . . : ${pack.name}`,
        `Scenario . . . . . . . . . . : ${pack.scenarioId ?? "*UNKNOWN"}`,
        `Path . . . . . . . . . . . . : ${pack.path}`,
      ]),
    };
  },

  goWorkshop: (session) => ({
    kind: "screen",
    screen: createWorkshopScreen(),
  }),

  exportWorkshopArtifact: (session, command) => {
    if ((session.guidanceMode ?? "coach") !== "workshop") {
      return { kind: "message", message: "CPF0006 - Workshop exports require CHGMODE MODE(WORKSHOP)." };
    }
    const missionId = getParameter(command, "MISSION") ?? "CLAIMS-001";
    const artifact = (getParameter(command, "ARTIFACT") ?? "worksheet").toLowerCase();
    const dir = join(process.cwd(), "data", "workshop");
    mkdirSync(dir, { recursive: true });
    const fileName = `${missionId}-${artifact}.md`;
    const expected = listExpectedFindings(missionId);
    const body =
      artifact === "answer-key"
        ? expected.map((e) => `- ${e.description}`).join("\n")
        : `# ${missionId} Worksheet\n\n## Evidence reviewed\n\n## Findings\n\n## Remediation\n`;
    writeFileSync(join(dir, fileName), `${body}\n`);
    return { kind: "message", message: `Workshop artifact exported: ${join(dir, fileName)}` };
  },
};

export function handleMessageDetailSubmit(
  session: IbmiSession,
  fields: Record<string, string>,
): MenuRouteResult {
  const queue = session.messageContext?.queueName ?? "QSYSOPR";
  const messageId = session.messageContext?.selectedMessageId;
  if (!messageId) {
    return { kind: "message", message: "CPF0006 - No message selected." };
  }
  const message = getMessageById(queue, messageId, session);
  if (!message) {
    return { kind: "message", message: "CPF2405 - Message not found." };
  }
  const reply = fields.MSG_REPLY ?? "";
  if (!message.requiresReply) {
    return {
      kind: "screen",
      screen: createDisplayMessageDetailScreen(session.systemName, queue, message),
    };
  }
  const result = replyToMessage(session, queue, messageId, reply);
  if (!result.ok) {
    return {
      kind: "screen",
      screen: createDisplayMessageDetailScreen(session.systemName, queue, message, result.message),
    };
  }
  return {
    kind: "screen",
    screen: createDisplayMessagesForSession(session, queue, result.message),
  };
}

export function handleChangePasswordSubmit(
  session: IbmiSession,
  fields: Record<string, string>,
): MenuRouteResult {
  const userName = session.userName;
  if (!userName) {
    return { kind: "message", message: "CPF0006 - Not signed on." };
  }

  const showError = (message: string): MenuRouteResult => ({
    kind: "screen",
    screen: createChangePasswordScreen(session.systemName, userName, message),
  });

  const current = (fields.CURPWD ?? "").replace(/_/g, " ").trim();
  const next = (fields.NEWPWD ?? "").replace(/_/g, " ").trim();
  const verify = (fields.VERPWD ?? "").replace(/_/g, " ").trim();

  if (!current) {
    return showError("Current password required.");
  }
  const auth = authenticateUser(userName, current, session.systemName);
  if (!auth.ok) {
    return showError("Current password not valid.");
  }
  if (!next) {
    return showError("New password required.");
  }
  if (next.length > 10) {
    return showError("Password must be 10 characters or less.");
  }
  if (next.toUpperCase() !== verify.toUpperCase()) {
    return showError("New password entries do not match.");
  }

  const result = changeUserProfile(session.systemName, userName, { password: next.toUpperCase() });
  if (!result.ok) {
    return showError(result.message);
  }

  const stored = next.toUpperCase();
  return {
    kind: "message",
    message:
      `CPI1116 - Password changed for user ${userName}. ` +
      `Sign on again with password ${stored}. Coach and welcome cards show your new password.`,
  };
}

export function handleFindingEditorSubmit(session: IbmiSession): MenuRouteResult {
  openFindingComposer(session);
  return {
    kind: "message",
    message: "Compose findings in the coach panel → F6 focuses the rail finding composer.",
  };
}

export function openFindingComposer(session: IbmiSession): MenuRouteResult {
  const attempt = ensureMissionAttempt(session);
  if (!attempt) {
    return { kind: "message", message: "CPF0006 - No active mission attempt." };
  }
  session.focusFindingComposer = true;
  const findings = listFindings(attempt.id);
  return {
    kind: "screen",
    screen: createFindingListScreen(session.systemName, session.userName!, findings),
  };
}

export function getCommandHandler(handlerName: string | undefined): CommandHandler | undefined {
  if (!handlerName) return undefined;
  return handlers[handlerName];
}

export function registerCommandHandler(name: string, handler: CommandHandler): void {
  handlers[name] = handler;
}

/** Menu selection numbers mapped to catalog command names (AUDIT menu). */
export const menuSelectionCommands: Record<string, string> = {
  "1": "WRKSYSVAL",
  "2": "WRKUSRPRF",
  "3": "WRKOBJ",
  "4": "DSPJRN JRN(QSYS/QAUDJRN) ENTTYP(PW AF CP)",
  "5": "WRKACTJOB",
  "6": "WRKSPLF",
  "7": "DSPJOBLOG",
  "8": "WRKFINDING",
  "9": "DSPMISSION",
  "10": "DSPEVID",
  "11": "SUBMITMSN",
  "60": "RSTLABPKG",
  "71": "DSPBLD",
  "72": "RUNBUILD",
};

export { handlers as commandHandlers };
