import { normalizeIdentifier } from "./fingerprint.js";
import type { RiskClass } from "./types.js";

export type AuthorityToolDefinition = {
  name: string;
  version: string;
  title: string;
  description: string;
  riskClass: RiskClass;
  mutating: boolean;
  adapterOperation: string;
  normalizeArguments(input: unknown): Record<string, unknown>;
  mcpAnnotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
};

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("arguments must be an object");
  return input as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, allowed: string[]): void {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) throw new TypeError(`unknown argument(s): ${extra.join(", ")}`);
  for (const key of allowed) if (!(key in value)) throw new TypeError(`${key} is required`);
}
function identifierArgs(input: unknown, keys: string[]): Record<string, unknown> {
  const value = record(input); exactKeys(value, keys);
  return Object.fromEntries(keys.map((key) => [key, normalizeIdentifier(value[key], key)]));
}

const definitions: AuthorityToolDefinition[] = [
  tool("inspect_user_profile", "Observe a user profile", "observe", false, (i) => identifierArgs(i, ["user"])),
  tool("inspect_object_authority", "Observe object authority", "observe", false, (i) => identifierArgs(i, ["library", "object", "user"])),
  tool("list_recent_audit_events", "List bounded audit events", "observe", false, (input) => {
    const value = record(input); exactKeys(value, ["user", "limit"]);
    const limit = value.limit;
    if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) throw new TypeError("limit must be an integer from 1 to 100");
    return { user: normalizeIdentifier(value.user, "user"), limit };
  }),
  tool("read_operational_messages", "Read bounded operational messages", "observe", false, (input) => {
    const value = record(input); exactKeys(value, ["limit"]);
    if (!Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 50) throw new TypeError("limit must be an integer from 1 to 50");
    return { limit: value.limit };
  }),
  tool("grant_object_authority", "Grant narrow object authority", "privilege_change", true, (input) => {
    const raw = record(input); exactKeys(raw, ["library", "object", "user", "authority"]);
    const authority = typeof raw.authority === "string" ? raw.authority.trim().toUpperCase() : "";
    if (!["*USE", "*CHANGE", "*ALL", "*EXCLUDE"].includes(authority)) throw new TypeError("authority is not allowed");
    return { library: normalizeIdentifier(raw.library, "library"), object: normalizeIdentifier(raw.object, "object"),
      user: normalizeIdentifier(raw.user, "user"), authority };
  }),
  tool("get_action_status", "Read proposal status", "observe", false, (input) => {
    const value = record(input); exactKeys(value, ["proposal_id"]);
    if (typeof value.proposal_id !== "string" || !value.proposal_id.trim()) throw new TypeError("proposal_id is required");
    return { proposal_id: value.proposal_id.trim() };
  }),
];

function tool(name: string, description: string, riskClass: RiskClass, mutating: boolean, normalizeArguments: AuthorityToolDefinition["normalizeArguments"]): AuthorityToolDefinition {
  return { name, version: "1", title: name.replaceAll("_", " "), description, riskClass, mutating,
    adapterOperation: name, normalizeArguments,
    mcpAnnotations: { readOnlyHint: !mutating, destructiveHint: mutating } };
}

export class ToolRegistry {
  private readonly byKey = new Map(definitions.map((entry) => [`${entry.name}@${entry.version}`, Object.freeze(entry)]));
  list(): readonly AuthorityToolDefinition[] { return [...this.byKey.values()]; }
  get(name: string, version = "1"): AuthorityToolDefinition | undefined { return this.byKey.get(`${name}@${version}`); }
  require(name: string, version = "1"): AuthorityToolDefinition {
    const found = this.get(name, version);
    if (!found) throw new Error("UNKNOWN_TOOL");
    return found;
  }
}

export const authorityToolRegistry = new ToolRegistry();
