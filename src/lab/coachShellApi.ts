import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import { buildOperatorCoachShell } from "./operatorCoach.js";
import { buildMissionCoachPayload, type MissionCoachPayload } from "./missionApi.js";
import type { OperatorCoachShell } from "./operatorCoach.js";

export type CoachShellPayload =
  | ({ mode: "auditor" } & MissionCoachPayload)
  | ({ mode: "operator" } & OperatorCoachShell);

export function buildCoachShell(
  systemName: string,
  lane: SessionLane,
  missionId?: string,
): CoachShellPayload | undefined {
  if (lane === "operator") {
    return { mode: "operator", ...buildOperatorCoachShell(systemName) };
  }
  const mission = buildMissionCoachPayload(systemName, missionId);
  if (!mission) return undefined;
  return { mode: "auditor", ...mission };
}
