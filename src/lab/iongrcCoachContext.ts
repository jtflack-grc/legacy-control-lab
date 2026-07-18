import { buildIongrcTrainerPayload, normalizeIongrcPackId } from "./iongrcTrainer.js";

export function buildIongrcCoachPayload(
  packId: string,
  stepIndex: number,
  systemName: string,
  screenId?: string,
) {
  return buildIongrcTrainerPayload(normalizeIongrcPackId(packId), stepIndex, systemName, screenId);
}
