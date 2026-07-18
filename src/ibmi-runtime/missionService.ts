import {
  getDefaultMission as getDefaultMissionRow,
  getMission as getMissionRow,
  type MissionRow,
} from "../db/repositories/missionRepository.js";

export type Mission = MissionRow;

export function getMission(missionId: string, systemName = "CLAIMS400"): Mission | undefined {
  return getMissionRow(systemName, missionId);
}

export function getDefaultMission(systemName = "CLAIMS400"): Mission | undefined {
  return getDefaultMissionRow(systemName);
}
