import {
  deleteMissionAttemptCascade,
  getActiveMissionAttempt,
  getMission,
} from "../db/repositories/missionRepository.js";

import { startMissionAttempt } from "../missions/missionEngine.js";
import { restoreAttemptBaseline } from "../runtime/attemptBaseline.js";

import {

  getCampaignMissionStatuses,

  findCampaignsForMission,
  resolvePrimaryCampaignForMission,

} from "../range/campaignService.js";

import { getRangeSystem } from "../range/loadRangeRegistry.js";

import {

  ensureScenarioPackLoaded,

  preloadUpcomingCampaignScenarios,

} from "../range/scenarioLoadService.js";

import { selectRangeSystem } from "../range/rangeService.js";

import { resolveLiveSessionForLab } from "./liveSessionRegistry.js";

import { findLabSession, findLabSessionForUser } from "./sessionRegistry.js";



export type StartMissionResult =

  | {

      ok: true;

      missionId: string;

      missionTitle: string;

      attemptId: string;

      campaignId: string;

      systemName: string;

      message: string;

    }

  | { ok: false; status: number; error: string };



function resolveCampaignMissionStatus(

  campaignId: string,

  userName: string,

  missionId: string,

) {

  return getCampaignMissionStatuses(campaignId, userName).find(

    (mission) => mission.entry.missionId === missionId.toUpperCase(),

  );

}



export function startMissionForLabUser(

  systemName: string,

  userName: string,

  missionId: string,

  campaignId?: string,

): StartMissionResult {

  const normalizedMissionId = missionId.toUpperCase();

  const normalizedUser = userName.trim().toUpperCase();

  const snapshot =

    findLabSession(systemName, normalizedUser) ?? findLabSessionForUser(normalizedUser);

  if (!snapshot) {

    return { ok: false, status: 409, error: "No active terminal session. Sign on in the green screen first." };

  }



  const session = resolveLiveSessionForLab(snapshot, systemName);

  if (!session) {

    return {

      ok: false,

      status: 409,

      error: "Terminal session not linked to coach. Refresh the lab page and sign on again.",

    };

  }



  if (!session.userName?.trim()) {

    return { ok: false, status: 409, error: "Terminal session is not signed on." };

  }



  const campaign = resolvePrimaryCampaignForMission(normalizedMissionId, campaignId);

  if (!campaign) {

    return { ok: false, status: 404, error: `No campaign found for mission ${normalizedMissionId}.` };

  }



  const missionStatus = resolveCampaignMissionStatus(campaign.campaignId, normalizedUser, normalizedMissionId);

  if (!missionStatus) {

    return {

      ok: false,

      status: 404,

      error: `Mission ${normalizedMissionId} is not part of campaign ${campaign.campaignId}.`,

    };

  }

  if (missionStatus.status === "locked") {

    return {

      ok: false,

      status: 403,

      error: `Mission ${normalizedMissionId} is locked. Complete the previous campaign mission first.`,

    };

  }

  if (missionStatus.status === "complete") {

    return {

      ok: false,

      status: 409,

      error: `Mission ${normalizedMissionId} is already complete. Pick the next open mission.`,

    };

  }



  const entry = missionStatus.entry;

  const rangeSystem = getRangeSystem(entry.systemId);

  if (!rangeSystem) {

    return {

      ok: false,

      status: 404,

      error: `Range system ${entry.systemId} not found for mission ${normalizedMissionId}.`,

    };

  }



  const loaded = ensureScenarioPackLoaded(rangeSystem.systemId);

  if (!loaded.ok) {

    return { ok: false, status: 500, error: loaded.error };

  }



  const targetSystem = loaded.systemName;

  const selectResult = selectRangeSystem(session, targetSystem);

  if (!selectResult.ok) {

    return { ok: false, status: 409, error: selectResult.message };

  }



  const mission = getMission(targetSystem, normalizedMissionId);

  if (!mission) {

    return {

      ok: false,

      status: 404,

      error: `Mission ${normalizedMissionId} is not installed on ${targetSystem}.`,

    };

  }



  session.campaignId = campaign.campaignId;

  session.missionAttemptId = undefined;

  const attempt = startMissionAttempt(session, normalizedMissionId);

  if (!attempt) {

    return {

      ok: false,

      status: 500,

      error: `Unable to start mission ${normalizedMissionId} on ${targetSystem}.`,

    };

  }



  preloadUpcomingCampaignScenarios(campaign.campaignId, normalizedUser);



  return {

    ok: true,

    missionId: normalizedMissionId,

    missionTitle: mission.title ?? normalizedMissionId,

    attemptId: attempt.id,

    campaignId: campaign.campaignId,

    systemName: targetSystem,

    message: `Mission ${normalizedMissionId} started on ${targetSystem}. Collect evidence in the coach rail or green screen.`,

  };

}

export function restartMissionForLabUser(
  systemName: string,
  userName: string,
  missionId: string,
): StartMissionResult {
  const normalizedMissionId = missionId.toUpperCase();
  const normalizedUser = userName.trim().toUpperCase();
  const snapshot =
    findLabSession(systemName, normalizedUser) ?? findLabSessionForUser(normalizedUser);

  if (!snapshot) {
    return { ok: false, status: 409, error: "No active terminal session. Sign on in the green screen first." };
  }

  const session = resolveLiveSessionForLab(snapshot, systemName);
  if (!session) {
    return {
      ok: false,
      status: 409,
      error: "Terminal session not linked to coach. Refresh the lab page and sign on again.",
    };
  }

  if (!session.userName?.trim()) {
    return { ok: false, status: 409, error: "Terminal session is not signed on." };
  }

  let rangeSystem = getRangeSystem(systemName);
  let targetSystem = rangeSystem?.systemName ?? systemName.trim().toUpperCase();
  if (!getMission(targetSystem, normalizedMissionId)) {
    const campaign = findCampaignsForMission(normalizedMissionId)[0];
    const entry = campaign?.missions.find((row) => row.missionId === normalizedMissionId);
    if (!entry) {
      return { ok: false, status: 404, error: `Mission ${normalizedMissionId} not found.` };
    }
    rangeSystem = getRangeSystem(entry.systemId);
    if (!rangeSystem) {
      return { ok: false, status: 404, error: `Range system ${entry.systemId} not found.` };
    }
    targetSystem = rangeSystem.systemName;
  }

  const loaded = ensureScenarioPackLoaded(rangeSystem?.systemId ?? targetSystem);
  if (!loaded.ok) {
    return { ok: false, status: 500, error: loaded.error };
  }
  targetSystem = loaded.systemName;

  const selectResult = selectRangeSystem(session, targetSystem);
  if (!selectResult.ok) {
    return { ok: false, status: 409, error: selectResult.message };
  }

  const mission = getMission(targetSystem, normalizedMissionId);
  if (!mission) {
    return {
      ok: false,
      status: 404,
      error: `Mission ${normalizedMissionId} is not installed on ${targetSystem}.`,
    };
  }

  const active = getActiveMissionAttempt(targetSystem, normalizedUser, normalizedMissionId);
  if (active) {
    restoreAttemptBaseline(active.id, targetSystem, session);
    deleteMissionAttemptCascade(active.id);
  }

  session.missionAttemptId = undefined;
  const attempt = startMissionAttempt(session, normalizedMissionId);
  if (!attempt) {
    return {
      ok: false,
      status: 500,
      error: `Unable to restart mission ${normalizedMissionId} on ${targetSystem}.`,
    };
  }

  return {
    ok: true,
    missionId: normalizedMissionId,
    missionTitle: mission.title ?? normalizedMissionId,
    attemptId: attempt.id,
    campaignId: session.campaignId ?? "",
    systemName: targetSystem,
    message: `Mission ${normalizedMissionId} restarted on ${targetSystem}. Evidence and findings cleared for a fresh attempt.`,
  };
}


