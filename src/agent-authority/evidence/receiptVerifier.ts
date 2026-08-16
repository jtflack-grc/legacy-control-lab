import type { Database as SqliteDatabase } from "better-sqlite3";
import { canonicalize } from "../canonicalize.js";
import { sha256 } from "../fingerprint.js";
import { listReceipts, receiptIntegrityMaterial } from "../../db/repositories/agentAuthorityRepository.js";

export type VerificationResult = { ok: boolean; checked: number; errors: string[]; headHash?: string };
export function verifyReceiptChain(db: SqliteDatabase): VerificationResult {
  const receipts = listReceipts(db); const errors: string[] = []; let previous: string | undefined;
  for (let index = 0; index < receipts.length; index += 1) {
    const receipt = receipts[index]!; const expectedSequence = index + 1;
    if (receipt.sequence !== expectedSequence) errors.push(`sequence ${receipt.sequence}: expected ${expectedSequence}`);
    let calculated: string | undefined;
    try { calculated = sha256(canonicalize(receiptIntegrityMaterial(receipt))); }
    catch { errors.push(`sequence ${receipt.sequence}: payload is not valid canonicalizable JSON`); }
    if (calculated && calculated !== receipt.payloadHash) errors.push(`sequence ${receipt.sequence}: payload hash mismatch`);
    if (receipt.previousHash !== previous) errors.push(`sequence ${receipt.sequence}: previous hash mismatch`);
    previous = receipt.payloadHash;
  }
  const head = db.prepare("SELECT last_sequence,last_hash FROM agent_authority_chain_state WHERE chain_id='default'").get() as {last_sequence:number;last_hash:string|null}|undefined;
  if (receipts.length > 0 && !head) errors.push("chain state is missing while receipts exist");
  if (head && (head.last_sequence !== receipts.length || (head.last_hash ?? undefined) !== previous)) errors.push("chain state does not match reconstructed head");
  return { ok: errors.length === 0, checked: receipts.length, errors, ...(previous ? { headHash: previous } : {}) };
}
