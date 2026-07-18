import type { IbmiSession } from "./sessionService.js";
import type { MenuRouteResult } from "./commandHandlers.js";
import { normalizeCommandVerb } from "./commandParser.js";
import { executeCatalogCommand, menuSelectionCommand } from "./commandRuntime.js";
import { createJournalEntryDetailScreen } from "../screen-runtime/screens/displayJournal.js";
import { createWorkObjectsScreen } from "../screen-runtime/screens/workObjects.js";
import { listWorkUserProfileNames } from "../screen-runtime/screens/workUserProfiles.js";
import { createDisplayAuthorityScreen } from "../screen-runtime/screens/workAuthority.js";
import { getUserProfile } from "./userProfileService.js";
import { listWorkSystemValueNames } from "../screen-runtime/screens/displaySystemValue.js";
import { listWorkObjectRefs } from "../screen-runtime/screens/workObjects.js";
import { listActiveJobs, listJobsBySubsystem, listJobsByUser } from "./jobService.js";
import { listSpooledFiles } from "./spoolService.js";
import { resolveJobForMenu } from "../screen-runtime/screens/displayJob.js";
import { routeJobWorkOption, routeWorkWithJobMenuOption } from "./jobWorkOptions.js";
import { buildActiveJobTreeRows } from "../screen-runtime/screens/ibmJobScreens.js";
import { parseSubfileOption, sliceSubfilePage } from "../screen-runtime/screens/screenHelpers.js";
import { createDisplayDiskUnitScreen } from "../screen-runtime/screens/systemMonitorScreens.js";
import { listDiskUnits } from "./systemMonitorService.js";
import {
  createNetStatConnectionScreen,
  createNetStatInterfaceScreen,
  createNetStatMenuScreen,
  createNetStatRouteScreen,
} from "../screen-runtime/screens/spoolNetworkScreens.js";
import { createInfoScreen } from "../screen-runtime/screens/screenHelpers.js";
import { getPhysicalFile } from "./physicalFileService.js";
import { listIfsLinks } from "./ifsLinkService.js";
import { createFileFieldDetailScreen } from "../screen-runtime/screens/displayFileFieldDescription.js";
import { createDisplayObjectLinkScreen } from "../screen-runtime/screens/displayObjectLink.js";
import { listActiveRangeSystems, selectRangeSystem } from "../range/rangeService.js";
import {
  getCampaignMissionStatuses,
  listCampaignSummaries,
  resolveCampaign,
} from "../range/campaignService.js";
import { listScorebookEntries } from "../db/repositories/scorebookRepository.js";
import {
  createWorkCampaignMissionsScreen,
  createWorkCampaignsScreen,
  createWorkRangeScreen,
  createWorkScorebookScreen,
  createWorkScenariosScreen,
  createWorkshopScreen,
} from "../screen-runtime/screens/rangeScreens.js";
import { listExpectedFindings } from "../db/repositories/missionRepository.js";
import { startMissionAttempt } from "../missions/missionEngine.js";
import { listScenarioPacks } from "../range/scenarioPack.js";
import { handleWorkWithMessagesBasicInput } from "./displayMessagesHandlers.js";
import { getMessages, removeMessage } from "./messageService.js";
import { createDisplayMessageDetailScreen } from "../screen-runtime/screens/displayMessageDetail.js";
import { createDisplayMessagesScreen } from "../screen-runtime/screens/displayMessages.js";
import { createDisplayPtfGroupScreen } from "../screen-runtime/screens/displayPtfGroup.js";
import { createDisplayPtfDetailScreen } from "../screen-runtime/screens/displayPtfDetail.js";
import { getPtfDetail, getPtfGroup, listAllPtfs, listPtfGroups, listPtfsForGroup } from "./ptfService.js";
import { getCommandHandler } from "./commandHandlers.js";
import { openCommandPrompt } from "./commandPromptService.js";
import { listLibrariesForWork } from "./libraryAdminService.js";
import {
  createDisplayLibraryDescriptionScreen,
  createDisplayLibraryScreen,
  listLibraryObjects,
} from "../screen-runtime/screens/libraryScreens.js";
import { listLinkServers } from "./networkService.js";
import { createDisplayLinkServerScreen } from "../screen-runtime/screens/networkScreens.js";
import { resolveCatalogWorkOption } from "./catalogWorkOptions.js";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { getCommand, type CommandDefinition } from "./commandCatalog.js";
import { eachVisibleSubfileOption, resetSubfilePage } from "./subfilePaging.js";
import {
  buildRunSqlCommand,
  getSampleQueryForService,
  listQsys2ServiceViews,
} from "../grc/grcSqlEvidenceCatalog.js";
import { createDisplaySqlServiceScreen } from "../screen-runtime/screens/workSqlServices.js";
import { SIGNOFF_MENU_SELECTION } from "../tn5250-host/menuNavigation.js";
import {
  createDisplayProgramScreen,
} from "../screen-runtime/screens/sourceScreens.js";
import {
  listProgramReferences,
  listSourceFiles,
  listSourceMembers,
} from "./sourceMemberService.js";
import { getCatalogObject } from "./objectCatalogService.js";
import { updateObject } from "../db/repositories/objectRepository.js";
import {
  createWorkObjectOwnerScreen,
  listWorkObjectOwnerRefs,
} from "../screen-runtime/screens/workObjectOwner.js";
import {
  createEditAuthorizationListScreen,
  ensureAutlEditContext,
} from "../screen-runtime/screens/editAuthorizationList.js";

function runSubfileCommand(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const subfileCommand = values.SUBFILE_CMD?.trim();
  if (!subfileCommand) return undefined;
  const commandName = normalizeCommandVerb(subfileCommand.split(/\s+/)[0]!);
  return executeCatalogCommand(session, commandName, subfileCommand);
}

export function handleWorkUserProfilesInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const profiles = listWorkUserProfileNames(session.systemName);
  const routed = eachVisibleSubfileOption(session, "WRKUSRPRF", profiles, "OPT", values, (profileName, option) => {
    if (option === "2") {
      return openCommandPrompt(session, `CHGUSRPRF USRPRF(${profileName})`);
    }
    if (option === "5") {
      return executeCatalogCommand(session, "DSPUSRPRF", `DSPUSRPRF USRPRF(${profileName})`);
    }
    if (option === "8") {
      const profile = getUserProfile(profileName, session.systemName);
      if (!profile) {
        return { kind: "message", message: `CPF2204 - User profile ${profileName} not found.` };
      }
      return {
        kind: "screen",
        screen: createDisplayAuthorityScreen(session.systemName, profileName, [
          `User profile . . . . . . . . . : ${profile.userName}`,
          `Special authorities  . . . . . : ${profile.specialAuthorities}`,
          `Group profile  . . . . . . . . : ${profile.groupProfile}`,
          `User class . . . . . . . . . . : ${profile.userClass}`,
        ]),
      };
    }
    if (option === "12") {
      return {
        kind: "screen",
        screen: createWorkObjectsScreen(session.systemName, session.userName!),
      };
    }
    return undefined;
  });
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

export function handleWorkSystemValuesInput(
  session: IbmiSession,
  values: Record<string, string>,
  screenId: "WRKSYSVAL" | "DSPSYSVAL" = "WRKSYSVAL",
): MenuRouteResult | undefined {
  const valueNames = listWorkSystemValueNames(session.systemName);
  const pageKey = screenId === "DSPSYSVAL" ? "DSPSYSVAL" : "WRKSYSVAL";
  const routed = eachVisibleSubfileOption(session, pageKey, valueNames, "SOPT", values, (valueName, option) => {
    if (option === "2") {
      return openCommandPrompt(session, `CHGSYSVAL SYSVAL(${valueName})`);
    }
    if (option === "5") {
      return executeCatalogCommand(session, "DSPSYSVAL", `DSPSYSVAL SYSVAL(${valueName})`);
    }
    return undefined;
  });
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

export function handleWorkObjectsInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const objects = listWorkObjectRefs(session.systemName);
  const routed = eachVisibleSubfileOption(session, "WRKOBJ", objects, "OOPT", values, ({ library, object }, option) => {
    if (option === "2") {
      return openCommandPrompt(session, `GRTOBJAUT OBJ(${library}/${object}) OBJTYPE(*FILE)`);
    }
    if (option === "5") {
      return executeCatalogCommand(session, "DSPOBJD", `DSPOBJD OBJ(${library}/${object})`);
    }
    if (option === "8") {
      return executeCatalogCommand(session, "DSPOBJAUT", `DSPOBJAUT OBJ(${library}/${object})`);
    }
    return undefined;
  });
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

export function handleDisplayJournalInput(
  session: IbmiSession,
  values: Record<string, string>,
  screenId: "DSPJRN" | "DSPSECAUD" | "DSPAUDJRNE" = "DSPJRN",
): MenuRouteResult | undefined {
  const entries = session.journalContext?.entries ?? [];
  const routed = eachVisibleSubfileOption(
    session,
    screenId,
    entries,
    "JOPT",
    values,
    (entry, option) => {
      if (option === "5") {
        return {
          kind: "screen",
          screen: createJournalEntryDetailScreen(session.systemName, session.userName!, entry),
        };
      }
      return undefined;
    },
  );
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

function jobsForWorkScreen(session: IbmiSession, screenId: string) {
  if (screenId === "WRKSBSJOB" && session.jobFilterContext?.subsystem) {
    return listJobsBySubsystem(session.systemName, session.jobFilterContext.subsystem);
  }
  if (screenId === "WRKUSRJOB" && session.jobFilterContext?.userName) {
    return listJobsByUser(session.systemName, session.jobFilterContext.userName);
  }
  if (screenId === "WRKJOB") {
    return listJobsByUser(session.systemName, session.jobFilterContext?.userName ?? session.userName ?? "AUDIT");
  }
  return listActiveJobs(session.systemName);
}

export function handleWorkJobsInput(
  session: IbmiSession,
  values: Record<string, string>,
  screenId = "WRKACTJOB",
): MenuRouteResult | undefined {
  if (screenId === "WRKACTJOB") {
    const jobs = jobsForWorkScreen(session, screenId);
    const page = session.subfilePage?.WRKACTJOB ?? 0;
    const visible = sliceSubfilePage(buildActiveJobTreeRows(jobs), page, 7);
    let jobSlot = 0;
    for (const row of visible) {
      if (row.kind !== "job") continue;
      const option = parseSubfileOption(values[`JOPT${jobSlot}`]);
      jobSlot += 1;
      if (!option) continue;
      const routed = routeJobWorkOption(session, row.job, option, screenId);
      if (routed) return routed;
    }
    return runSubfileCommand(session, values);
  }

  const maxRows = screenId === "WRKSBSJOB" || screenId === "WRKUSRJOB" ? 10 : 12;
  const jobs = jobsForWorkScreen(session, screenId).slice(0, maxRows);
  for (let index = 0; index < jobs.length; index += 1) {
    const option = parseSubfileOption(values[`JOPT${index}`]);
    if (!option) continue;
    const routed = routeJobWorkOption(session, jobs[index]!, option, screenId);
    if (routed) return routed;
  }

  return runSubfileCommand(session, values);
}

export function handleWorkWithJobMenuInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const selection = values.COMMAND?.trim() ?? "";
  const job = resolveJobForMenu(session);
  if (!job) {
    return { kind: "message", message: "CPF1336 - Job not found." };
  }

  return routeWorkWithJobMenuOption(session, job, selection);
}

export function handleWorkDiskStatusInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const units = listDiskUnits(session.systemName);
  for (let index = 0; index < units.length; index += 1) {
    if (values[`DOPT${index}`]?.trim() === "5") {
      const unit = units[index]!;
      return {
        kind: "screen",
        screen: createDisplayDiskUnitScreen(session.systemName, unit),
      };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleWorkSpooledFilesInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const files = listSpooledFiles(session.systemName);
  const routed = eachVisibleSubfileOption(session, "WRKSPLF", files, "SPLT", values, (file, option) => {
    if (option === "5") {
      return {
        kind: "screen",
        screen: createInfoScreen("WRKSPLF", "Spooled File Detail", session.systemName, session.userName!, [
          `File . . . . . . . . . . . . . : ${file.fileName}`,
          `User . . . . . . . . . . . . . : ${file.userName}`,
          `Number . . . . . . . . . . . . : ${file.spoolNumber}`,
          `Status . . . . . . . . . . . . : ${file.status}`,
        ]),
      };
    }
    return undefined;
  });
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

export function handleDisplayFileFieldInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const context = session.fileContext;
  if (!context) return runSubfileCommand(session, values);

  const file = getPhysicalFile(session.systemName, context.library, context.name);
  if (!file) return runSubfileCommand(session, values);

  for (let index = 0; index < file.fields.length; index += 1) {
    if (values[`FOPT${index}`]?.trim() === "5") {
      const field = file.fields[index]!;
      return {
        kind: "screen",
        screen: createFileFieldDetailScreen(session.systemName, session.userName!, file, field.name),
      };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleWorkObjectLinksInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const directory = session.ifsContext?.directory ?? "/";
  const links = listIfsLinks(session.systemName, directory);
  const routed = eachVisibleSubfileOption(session, "WRKLNK", links, "LOPT", values, (link, option) => {
    if (option === "5") {
      const fullPath = directory === "/" ? `/${link.name}` : `${directory}/${link.name}`;
      return {
        kind: "screen",
        screen: createDisplayObjectLinkScreen(session.systemName, session.userName!, link, fullPath),
      };
    }
    return undefined;
  });
  if (routed) return routed;

  return runSubfileCommand(session, values);
}

export function handleWorkRangeInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const systems = listActiveRangeSystems().slice(0, 10);
  for (let index = 0; index < systems.length; index += 1) {
    const option = values[`OPT${index}`]?.trim();
    if (!option) continue;

    const system = systems[index]!;
    if (option === "1") {
      const result = selectRangeSystem(session, system.systemName);
      if (!result.ok) {
        return {
          kind: "screen",
          screen: createWorkRangeScreen(systems, session.systemName, result.message),
        };
      }
      return {
        kind: "screen",
        screen: createWorkRangeScreen(
          listActiveRangeSystems().slice(0, 10),
          session.systemName,
          `System changed to ${session.systemName}.`,
        ),
      };
    }
    if (option === "5") {
      return {
        kind: "screen",
        screen: createInfoScreen("DSPSYSRNG", "Display Range System", session.systemName, session.userName ?? "", [
          `System . . . . . . . . . . . . : ${system.systemName}`,
          `System ID  . . . . . . . . . . : ${system.systemId}`,
          `Title  . . . . . . . . . . . . : ${system.title}`,
          `Industry . . . . . . . . . . . : ${system.industry}`,
          `Default mission  . . . . . . . : ${system.defaultMission}`,
          `Scenario path  . . . . . . . . : ${system.scenarioPath}`,
        ]),
      };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleWorkCampaignsInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const userName = session.userName ?? "AUDIT";
  const campaigns = listCampaignSummaries(userName);
  for (let index = 0; index < campaigns.length; index += 1) {
    const option = values[`OPT${index}`]?.trim();
    if (!option) continue;

    const campaign = campaigns[index]!;
    if (option === "1") {
      session.campaignId = campaign.campaignId;
      return {
        kind: "screen",
        screen: createWorkCampaignMissionsScreen(
          campaign.campaignId,
          getCampaignMissionStatuses(campaign.campaignId, userName),
        ),
      };
    }
    if (option === "5") {
      const resolved = resolveCampaign(campaign.campaignId);
      return {
        kind: "screen",
        screen: createInfoScreen("CAMPAIGN", "Display Campaign", session.systemName, userName, [
          `Campaign . . . . . . . . . . . : ${campaign.campaignId}`,
          `Title  . . . . . . . . . . . . : ${resolved?.title ?? campaign.title}`,
          `Progress . . . . . . . . . . . : ${campaign.completed}/${campaign.total} missions complete`,
          resolved?.description ?? "",
        ]),
      };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleWorkCampaignMissionsInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const userName = session.userName ?? "AUDIT";
  const campaignId = session.campaignId ?? "IBM-I-ACCESS-GOVERNANCE";
  const missions = getCampaignMissionStatuses(campaignId, userName).slice(0, 10);

  for (let index = 0; index < missions.length; index += 1) {
    const option = values[`OPT${index}`]?.trim();
    if (!option) continue;

    const mission = missions[index]!;
    if (option === "1") {
      if (mission.status === "locked") {
        return {
          kind: "screen",
          screen: createWorkCampaignMissionsScreen(
            campaignId,
            getCampaignMissionStatuses(campaignId, userName),
            "Mission locked until the previous mission is complete.",
          ),
        };
      }
      const system = listActiveRangeSystems().find((entry) => entry.systemName === mission.systemName);
      if (system) selectRangeSystem(session, system.systemName);
      const attempt = startMissionAttempt(session, mission.entry.missionId);
      if (!attempt) {
        return {
          kind: "screen",
          screen: createWorkCampaignMissionsScreen(
            campaignId,
            getCampaignMissionStatuses(campaignId, userName),
            `CPF2204 - Unable to start mission ${mission.entry.missionId}.`,
          ),
        };
      }
      return {
        kind: "screen",
        screen: createWorkCampaignMissionsScreen(
          campaignId,
          getCampaignMissionStatuses(campaignId, userName),
          `Mission ${mission.entry.missionId} started on ${session.systemName}.`,
        ),
      };
    }
    if (option === "5") {
      return {
        kind: "screen",
        screen: createInfoScreen("DSPMISSION", "Display Mission", session.systemName, userName, [
          `Mission . . . . . . . . . . . : ${mission.entry.missionId}`,
          `System  . . . . . . . . . . . : ${mission.systemName}`,
          `Title . . . . . . . . . . . . : ${mission.title}`,
          `Status  . . . . . . . . . . . : ${mission.status}`,
          `Score . . . . . . . . . . . . : ${mission.score === null ? "*NONE" : String(Math.round(mission.score))}`,
        ]),
      };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleWorkScorebookInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const userName = session.userName ?? "AUDIT";
  const entries = listScorebookEntries(userName).slice(0, 10);
  for (let index = 0; index < entries.length; index += 1) {
    const option = values[`OPT${index}`]?.trim();
    if (option !== "5") continue;

    const entry = entries[index]!;
    return {
      kind: "screen",
      screen: createInfoScreen("DSPSCORE", "Display Scorebook Entry", session.systemName, userName, [
        `Mission . . . . . . . . . . . : ${entry.missionId}`,
        `System  . . . . . . . . . . . : ${entry.systemName}`,
        `Persona . . . . . . . . . . . : ${entry.personaId ?? "auditor"}`,
        `Mode  . . . . . . . . . . . . : ${entry.guidanceMode ?? "coach"}`,
        `Status  . . . . . . . . . . . : ${entry.status}`,
        `Score . . . . . . . . . . . . : ${entry.totalScore === null ? "*NONE" : String(Math.round(entry.totalScore))}`,
        `Started . . . . . . . . . . . : ${entry.startedAt}`,
        `Completed . . . . . . . . . . : ${entry.completedAt ?? "*NONE"}`,
      ]),
    };
  }

  return runSubfileCommand(session, values);
}

export function handleWorkScenariosInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const packs = listScenarioPacks();
  for (let index = 0; index < packs.length; index += 1) {
    const option = values[`OPT${index}`]?.trim();
    if (option !== "5") continue;

    const pack = packs[index]!;
    return executeCatalogCommand(session, "DSPSCN", `DSPSCN PACKAGE(${pack.name})`);
  }

  return runSubfileCommand(session, values);
}

export function handleWorkshopInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const input = values.SUBFILE_CMD?.trim() ?? "";
  if (/^\d+$/.test(input)) {
    const defaultMission = "CLAIMS-001";
    switch (input) {
      case "1": {
        const expected = listExpectedFindings(defaultMission);
        return {
          kind: "screen",
          screen: createInfoScreen(
            "DSPANSKEY",
            "Scenario Answer Key",
            session.systemName,
            session.userName ?? "",
            expected.length > 0
              ? expected.map((entry) => `- ${entry.description}`)
              : ["No expected findings defined for the default mission."],
          ),
        };
      }
      case "2": {
        const expected = listExpectedFindings(defaultMission);
        return {
          kind: "screen",
          screen: createInfoScreen(
            "DSPEXPFND",
            "Expected Findings",
            session.systemName,
            session.userName ?? "",
            expected.length > 0
              ? expected.map((entry) => `${entry.findingKey}: ${entry.description}`)
              : ["No expected findings defined for the default mission."],
          ),
        };
      }
      case "3":
      case "4": {
        const artifact = input === "3" ? "worksheet" : "facilitator";
        const handler = getCommandHandler("exportWorkshopArtifact");
        if (!handler) {
          return {
            kind: "screen",
            screen: createWorkshopScreen("CPF0006 - Workshop export handler unavailable."),
          };
        }
        const parsed = {
          name: "EXPWSH",
          positionals: [],
          parameters: { ARTIFACT: artifact, MISSION: defaultMission },
          raw: `EXPWSH MISSION(${defaultMission}) ARTIFACT(${artifact})`,
        };
        const definition: CommandDefinition = getCommand("EXPWSH") ?? {
          name: "EXPWSH",
          displayName: "Export Workshop Artifact",
          category: "lab",
          status: "implemented",
          handler: "exportWorkshopArtifact",
          allowLimitedUser: true,
          requiresAuthority: [],
          parameters: [],
        };
        const route = handler(session, parsed, definition);
        if (route.kind === "message") {
          return { kind: "screen", screen: createWorkshopScreen(route.message) };
        }
        return route;
      }
      case "5": {
        session.missionAttemptId = undefined;
        startMissionAttempt(session);
        return {
          kind: "screen",
          screen: createWorkshopScreen("Current mission attempt reset."),
        };
      }
      case "6":
        return executeCatalogCommand(session, "WRKSCN", "WRKSCN");
      default:
        return {
          kind: "screen",
          screen: createWorkshopScreen(`CPF0006 - Selection ${input} not valid.`),
        };
    }
  }

  return runSubfileCommand(session, values);
}

export function handleCatalogWorkInput(
  session: IbmiSession,
  screenId: string,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const context = session.catalogWorkContext;
  if (!context || context.screenId !== screenId) return undefined;

  const category = getCatalogCommand(screenId)?.category ?? "library_object";
  for (let index = 0; index < context.rows.length; index += 1) {
    const option = values[`WOPT${index}`]?.trim();
    if (!option) continue;
    const row = context.rows[index];
    if (!row) continue;
    const action = resolveCatalogWorkOption(category, option, row, index, screenId);
    if (!action) {
      return { kind: "message", message: `CPF0006 - Option ${option} not valid for this entry.` };
    }
    return executeCatalogCommand(session, action.command, action.input);
  }

  return runSubfileCommand(session, values);
}

export function handleWorkLibrariesInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const libraries = listLibrariesForWork(session);
  const page = session.subfilePage?.WRKLIB ?? 0;
  const visible = sliceSubfilePage(libraries, page);
  for (let index = 0; index < visible.length; index += 1) {
    const option = values[`LOPT${index}`]?.trim();
    if (!option) continue;
    const library = visible[index]!;
    if (option === "5") {
      resetSubfilePage(session, "DSPLIB");
      const objects = listLibraryObjects(session.systemName, library.name);
      session.libraryContext = {
        name: library.name,
        type: library.type,
        text: library.text,
        objectCount: objects.length,
      };
      return {
        kind: "screen",
        screen: createDisplayLibraryScreen(session.systemName, library, objects, 0),
      };
    }
    if (option === "8") {
      return {
        kind: "screen",
        screen: createDisplayLibraryDescriptionScreen(session.systemName, library),
      };
    }
  }
  return runSubfileCommand(session, values);
}

export function handleWorkLinkServersInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const servers = listLinkServers();
  for (let index = 0; index < servers.length; index += 1) {
    if (values[`NOPT${index}`]?.trim() === "5") {
      return {
        kind: "screen",
        screen: createDisplayLinkServerScreen(session.systemName, servers[index]!),
      };
    }
  }
  return runSubfileCommand(session, values);
}

export function handleWorkMessagesInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const astLevel = session.messageContext?.astLevel ?? "basic";
  if (astLevel === "basic") {
    return handleWorkWithMessagesBasicInput(session, values);
  }

  const queue = session.messageContext?.queueName ?? "QSYSOPR";
  const messages = getMessages(queue, session);
  const routed = eachVisibleSubfileOption(session, "DSPMSGINT", messages, "MOPT", values, (message, option) => {
    if (option === "4") {
      const result = removeMessage(session, queue, message.id);
      if (!result.ok) {
        return { kind: "message", message: result.message };
      }
      return {
        kind: "screen",
        screen: createDisplayMessagesScreen(
          session.systemName,
          queue,
          getMessages(queue, session),
          session.subfilePage?.DSPMSGINT ?? 0,
        ),
      };
    }
    if (option === "5") {
      session.messageContext = { queueName: queue, selectedMessageId: message.id };
      return {
        kind: "screen",
        screen: createDisplayMessageDetailScreen(session.systemName, queue, message),
      };
    }
    if (option === "6") {
      if (!message.requiresReply) {
        return { kind: "message", message: "CPF2406 - Message does not require a reply." };
      }
      session.messageContext = { queueName: queue, selectedMessageId: message.id };
      return {
        kind: "screen",
        screen: createDisplayMessageDetailScreen(session.systemName, queue, message),
      };
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleWorkPtfGroupsInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const groups = listPtfGroups(session.systemName);
  const routed = eachVisibleSubfileOption(session, "WRKPTFGRP", groups, "PGOPT", values, (group, option) => {
    if (option === "5") {
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
    }
    if (option === "8") {
      const pending = listPtfsForGroup(group.groupId).filter((row) => row.status !== "Applied");
      const lines =
        pending.length > 0
          ? pending.map((row) => `${row.ptfId}  ${row.status}  ${row.description}`)
          : [`No special-handling PTFs pending for ${group.groupId}.`];
      return {
        kind: "screen",
        screen: createInfoScreen(
          "DSPPTF",
          "Display Special Handling PTFs",
          session.systemName,
          session.userName!,
          [`PTF group ${group.groupId}`, ...lines],
        ),
      };
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleWorkPtfsInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const ptfs = listAllPtfs(session.systemName);
  const routed = eachVisibleSubfileOption(session, "WRKPTF", ptfs, "WPTOPT", values, (ptf, option) => {
    if (option === "5") {
      const detail = getPtfDetail(ptf.ptfId, ptf.groupId);
      if (!detail) {
        return { kind: "message", message: `CPF0006 - PTF ${ptf.ptfId} not found.` };
      }
      return {
        kind: "screen",
        screen: createDisplayPtfDetailScreen(session.systemName, detail),
      };
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleDisplayPtfGroupInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const groupId = session.ptfContext?.groupId;
  if (!groupId) return runSubfileCommand(session, values);
  const group = getPtfGroup(groupId);
  if (!group) return runSubfileCommand(session, values);
  const ptfs = listPtfsForGroup(groupId);
  const routed = eachVisibleSubfileOption(session, "DSPPTFGRP", ptfs, "PTOPT", values, (ptf, option) => {
    if (option === "5") {
      const detail = getPtfDetail(ptf.ptfId);
      if (!detail) {
        return { kind: "message", message: `CPF0006 - PTF ${ptf.ptfId} not found.` };
      }
      return {
        kind: "screen",
        screen: createDisplayPtfDetailScreen(session.systemName, detail),
      };
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleWorkSqlServicesInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const services = listQsys2ServiceViews();
  const routed = eachVisibleSubfileOption(session, "WRKSQLSVC", services, "SQLOPT", values, (service, option) => {
    if (option === "5") {
      return { kind: "screen", screen: createDisplaySqlServiceScreen(session.systemName, service) };
    }
    if (option === "6") {
      const sample = getSampleQueryForService(service);
      if (!sample) return undefined;
      return executeCatalogCommand(session, "RUNSQL", buildRunSqlCommand(sample.sql));
    }
    return undefined;
  });
  if (routed) return routed;

  const command = values.SUBFILE_CMD?.trim() ?? values.COMMAND?.trim() ?? "";
  if (command === SIGNOFF_MENU_SELECTION) {
    return executeCatalogCommand(session, "SIGNOFF", "SIGNOFF");
  }
  const menuCommand = menuSelectionCommand(session, command, "WRKSQLSVC");
  if (menuCommand) {
    const verb = menuCommand.split(/\s+/)[0]!;
    return executeCatalogCommand(session, verb, menuCommand);
  }

  return runSubfileCommand(session, values);
}

export function handleStartPdmInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const library = session.pdmContext?.library ?? "CLAIMS400";
  const selection = values.OPT?.trim() ?? values.COMMAND?.trim() ?? values.SUBFILE_CMD?.trim() ?? "";
  if (selection === "1") {
    return executeCatalogCommand(session, "WRKLIB", "WRKLIB");
  }
  if (selection === "2" || selection === "4") {
    return executeCatalogCommand(session, "WRKOBJPDM", `WRKOBJPDM LIB(${library})`);
  }
  if (selection === "3") {
    const file = session.pdmContext?.sourceFile ?? "QCLSRC";
    return executeCatalogCommand(session, "WRKMBRPDM", `WRKMBRPDM FILE(${library}/${file})`);
  }
  if (selection) {
    return { kind: "message", message: `CPF0006 - Option ${selection} not supported on STRPDM.` };
  }
  return undefined;
}

export function handleWorkMemberPdmInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const library = session.pdmContext?.library ?? "CLAIMS400";
  const file = session.pdmContext?.sourceFile ?? "QCLSRC";
  const members = listSourceMembers(session.systemName, library, file);
  const routed = eachVisibleSubfileOption(session, "WRKMBRPDM", members, "MBROPT", values, (member, option) => {
    if (option === "5") {
      return executeCatalogCommand(
        session,
        "DSPPFM",
        `DSPPFM FILE(${member.library}/${member.file}) MBR(${member.member})`,
      );
    }
    if (option === "2") {
      return openCommandPrompt(session, `CHGPGM PGM(${member.library}/${member.member})`);
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleWorkObjectPdmInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const library = session.pdmContext?.library ?? "CLAIMS400";
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
  const objects = [...sourceFiles, ...programNames];
  const routed = eachVisibleSubfileOption(session, "WRKOBJPDM", objects, "OBJOPT", values, (object, option) => {
    if (option === "5" && object.type === "*FILE") {
      return executeCatalogCommand(session, "WRKMBRPDM", `WRKMBRPDM FILE(${library}/${object.name})`);
    }
    if (option === "5" && object.type === "*PGM") {
      const catalog = getCatalogObject(session.systemName, library, object.name);
      return {
        kind: "screen",
        screen: createDisplayProgramScreen(
          session.systemName,
          object.name,
          library,
          catalog?.text ?? "Program object",
        ),
      };
    }
    if (option === "2") {
      return openCommandPrompt(session, `CHGPGM PGM(${library}/${object.name})`);
    }
    return undefined;
  });
  if (routed) return routed;
  return runSubfileCommand(session, values);
}

export function handleWorkObjectOwnerInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const context = session.objOwnContext;
  if (!context) return undefined;

  const objects = listWorkObjectOwnerRefs(session.systemName, context);
  const routed = eachVisibleSubfileOption(
    session,
    "WRKOBJOWN",
    objects,
    "OOPT",
    values,
    ({ library, object }, option) => {
      const qualified = `${library}/${object}`;
      if (option === "2") {
        return executeCatalogCommand(session, "EDTOBJAUT", `EDTOBJAUT OBJ(${qualified})`);
      }
      if (option === "5") {
        return executeCatalogCommand(session, "DSPOBJAUT", `DSPOBJAUT OBJ(${qualified})`);
      }
      if (option === "8") {
        return executeCatalogCommand(session, "DSPOBJD", `DSPOBJD OBJ(${qualified})`);
      }
      if (option === "4") {
        return {
          kind: "message",
          message: `CPF0000 - DLTOBJ OBJ(${qualified}) is not supported on this panel in the lab.`,
        };
      }
      return undefined;
    },
  );
  if (routed) return routed;

  const subfileCommand = values.SUBFILE_CMD?.trim();
  if (subfileCommand) {
    const newOwnMatch = /NEWOWN\s*\(\s*([^)]+)\s*\)/i.exec(subfileCommand);
    if (newOwnMatch) {
      const newOwner = newOwnMatch[1]!.trim().toUpperCase();
      const page = session.subfilePage?.WRKOBJOWN ?? 0;
      const pageSize = 7;
      const start = page * pageSize;
      const selected: typeof objects = [];
      for (let visibleIndex = 0; visibleIndex < pageSize; visibleIndex += 1) {
        if (parseSubfileOption(values[`OOPT${visibleIndex}`]) !== "9") continue;
        const obj = objects[start + visibleIndex];
        if (obj) selected.push(obj);
      }
      if (selected.length === 0) {
        return {
          kind: "message",
          message: "CPF0006 - Type 9 beside objects before entering NEWOWN on the command line.",
        };
      }
      for (const obj of selected) {
        updateObject(session.systemName, obj.library, obj.object, { owner: newOwner });
      }
      return {
        kind: "screen",
        screen: createWorkObjectOwnerScreen(
          session.systemName,
          context,
          session.subfilePage?.WRKOBJOWN ?? 0,
        ),
      };
    }
    return runSubfileCommand(session, values);
  }

  return runSubfileCommand(session, values);
}

export function handleEditAuthorizationListInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const context = session.autlEditContext;
  if (!context) return undefined;

  for (let index = 0; index < context.members.length; index += 1) {
    const option = parseSubfileOption(values[`UOPT${index}`]);
    if (option !== "4") continue;
    context.members.splice(index, 1);
    return {
      kind: "screen",
      screen: createEditAuthorizationListScreen(
        session.systemName,
        context.listName,
        context.members,
      ),
    };
  }

  return runSubfileCommand(session, values);
}

export function handleNetStatMenuInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const selection = values.COMMAND?.trim() ?? "";
  if (selection === "1") {
    return { kind: "screen", screen: createNetStatInterfaceScreen(session.systemName) };
  }
  if (selection === "2") {
    return { kind: "screen", screen: createNetStatRouteScreen(session.systemName) };
  }
  if (selection === "3") {
    return { kind: "screen", screen: createNetStatConnectionScreen(session.systemName) };
  }
  if (selection) {
    return { kind: "message", message: `CPF0006 - Option ${selection} not supported on NETSTAT menu.` };
  }
  return undefined;
}

export function handleCfgTcpMenuInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const selection = values.COMMAND?.trim() ?? "";
  if (selection === "1") {
    return executeCatalogCommand(session, "NETSTAT", "NETSTAT OPTION(*IFC)");
  }
  if (selection === "2") {
    return executeCatalogCommand(session, "NETSTAT", "NETSTAT OPTION(*RTE)");
  }
  if (selection === "3" || selection === "12") {
    return executeCatalogCommand(session, "CHGNETA", "CHGNETA");
  }
  if (selection === "10") {
    return { kind: "message", message: "CPF9801 - Host table work panel not implemented in lab — use NETSTAT." };
  }
  if (selection === "13") {
    return { kind: "message", message: "CPF9801 - Remote name server panel not implemented in lab partition." };
  }
  if (selection === "20") {
    return executeCatalogCommand(session, "WRKTCPIP", "WRKTCPIP");
  }
  if (selection) {
    return { kind: "message", message: `CPF0006 - Option ${selection} not supported on CFGTCP menu.` };
  }
  return undefined;
}
