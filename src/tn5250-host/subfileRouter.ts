import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { MenuRouteResult } from "../ibmi-runtime/commandHandlers.js";
import {
  handleDisplayJournalInput,
  handleWorkJobsInput,
  handleWorkDiskStatusInput,
  handleWorkObjectsInput,
  handleWorkSpooledFilesInput,
  handleWorkSystemValuesInput,
  handleWorkUserProfilesInput,
  handleDisplayFileFieldInput,
  handleWorkObjectLinksInput,
  handleWorkRangeInput,
  handleWorkCampaignsInput,
  handleWorkCampaignMissionsInput,
  handleWorkScorebookInput,
  handleWorkScenariosInput,
  handleWorkshopInput,
  handleCatalogWorkInput,
  handleWorkLibrariesInput,
  handleWorkLinkServersInput,
  handleWorkWithJobMenuInput,
  handleNetStatMenuInput,
  handleCfgTcpMenuInput,
  handleWorkMessagesInput,
  handleWorkPtfGroupsInput,
  handleWorkPtfsInput,
  handleDisplayPtfGroupInput,
  handleWorkSqlServicesInput,
  handleStartPdmInput,
  handleWorkMemberPdmInput,
  handleWorkObjectPdmInput,
  handleWorkObjectOwnerInput,
  handleEditAuthorizationListInput,
} from "../ibmi-runtime/subfileHandlers.js";
import type { ScreenDefinition } from "../screen-runtime/screen.js";

export { shouldPushScreenStack } from "./menuNavigation.js";

function isSystemValuesSubfileScreen(screenId: ScreenDefinition["id"]): boolean {
  return screenId === "WRKSYSVAL" || screenId === "DSPSYSVAL";
}

function isJournalSubfileScreen(screenId: ScreenDefinition["id"]): boolean {
  return screenId === "DSPJRN" || screenId === "DSPSECAUD" || screenId === "DSPAUDJRNE";
}

export function handleSubfileScreenInput(
  session: IbmiSession,
  screenId: ScreenDefinition["id"],
  values: Record<string, string>,
): MenuRouteResult | undefined {
  if (screenId === "WRKUSRPRF") {
    return handleWorkUserProfilesInput(session, values);
  }
  if (isSystemValuesSubfileScreen(screenId)) {
    return handleWorkSystemValuesInput(
      session,
      values,
      screenId as "WRKSYSVAL" | "DSPSYSVAL",
    );
  }
  if (screenId === "WRKOBJ") {
    return handleWorkObjectsInput(session, values);
  }
  if (isJournalSubfileScreen(screenId)) {
    return handleDisplayJournalInput(
      session,
      values,
      screenId as "DSPJRN" | "DSPSECAUD" | "DSPAUDJRNE",
    );
  }
  if (
    screenId === "WRKACTJOB" ||
    screenId === "WRKSBMJOB" ||
    screenId === "WRKJOBQ" ||
    screenId === "WRKJOB" ||
    screenId === "WRKSBSJOB" ||
    screenId === "WRKUSRJOB"
  ) {
    return handleWorkJobsInput(session, values, screenId);
  }
  if (screenId === "WRKDSKSTS") {
    return handleWorkDiskStatusInput(session, values);
  }
  if (screenId === "WRKSPLF") {
    return handleWorkSpooledFilesInput(session, values);
  }
  if (screenId === "DSPMSG" || screenId === "DSPMSGINT") {
    return handleWorkMessagesInput(session, values);
  }
  if (screenId === "WRKSQLSVC") {
    return handleWorkSqlServicesInput(session, values);
  }
  if (screenId === "STRPDM") {
    return handleStartPdmInput(session, values);
  }
  if (screenId === "WRKMBRPDM") {
    return handleWorkMemberPdmInput(session, values);
  }
  if (screenId === "WRKOBJPDM") {
    return handleWorkObjectPdmInput(session, values);
  }
  if (screenId === "WRKOBJOWN") {
    return handleWorkObjectOwnerInput(session, values);
  }
  if (screenId === "EDTAUTL") {
    return handleEditAuthorizationListInput(session, values);
  }
  if (screenId === "WRKPTFGRP") {
    return handleWorkPtfGroupsInput(session, values);
  }
  if (screenId === "WRKPTF") {
    return handleWorkPtfsInput(session, values);
  }
  if (screenId === "DSPPTFGRP") {
    return handleDisplayPtfGroupInput(session, values);
  }
  if (screenId === "DSPFFD") {
    return handleDisplayFileFieldInput(session, values);
  }
  if (screenId === "WRKLNK") {
    return handleWorkObjectLinksInput(session, values);
  }
  if (screenId === "WRKRANGE") {
    return handleWorkRangeInput(session, values);
  }
  if (screenId === "WRKCMPGN") {
    return handleWorkCampaignsInput(session, values);
  }
  if (screenId === "WRKCMPMSN") {
    return handleWorkCampaignMissionsInput(session, values);
  }
  if (screenId === "WRKSCORE") {
    return handleWorkScorebookInput(session, values);
  }
  if (screenId === "WRKSCN") {
    return handleWorkScenariosInput(session, values);
  }
  if (screenId === "WORKSHOP") {
    return handleWorkshopInput(session, values);
  }
  if (screenId === "WRKLIB") {
    return handleWorkLibrariesInput(session, values);
  }
  if (screenId === "DSPJOB") {
    return handleWorkWithJobMenuInput(session, values);
  }
  if (screenId === "NETSTAT") {
    return handleNetStatMenuInput(session, values);
  }
  if (screenId === "CFGTCP") {
    return handleCfgTcpMenuInput(session, values);
  }
  if (screenId === "WRKLNKSVR") {
    return handleWorkLinkServersInput(session, values);
  }
  if (screenId.startsWith("WRK") && session.catalogWorkContext?.screenId === screenId) {
    return handleCatalogWorkInput(session, screenId, values);
  }
  return undefined;
}
