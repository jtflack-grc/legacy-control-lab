import type { Database as SqliteDatabase } from "better-sqlite3";
import { canonicalize } from "../canonicalize.js";
import type { Clock, IdGenerator } from "../types.js";
import { appendReceipt, type ReceiptRecord } from "../../db/repositories/agentAuthorityRepository.js";

export type ReceiptPayload = Record<string, unknown>;
export function createReceipt(db: SqliteDatabase, deps: { clock: Clock; ids: IdGenerator }, input: {
  type: string; payload: ReceiptPayload; proposalId?: string;
}): ReceiptRecord {
  const payloadJson = canonicalize(input.payload);
  return appendReceipt(db, {
    id: deps.ids.id("rcpt"), createdAt: deps.clock.now().toISOString(),
    ...(input.proposalId ? { proposalId: input.proposalId } : {}),
    receiptType: input.type, payloadJson,
  });
}
