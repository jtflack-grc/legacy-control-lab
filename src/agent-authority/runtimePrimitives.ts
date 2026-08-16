import { randomBytes, randomUUID } from "node:crypto";
import type { Clock, IdGenerator } from "./types.js";

export const systemClock: Clock = { now: () => new Date() };
export const secureIds: IdGenerator = {
  id: (prefix) => `${prefix}_${randomUUID()}`,
  nonce: () => randomBytes(32).toString("base64url"),
};
