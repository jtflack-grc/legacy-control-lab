import type { RuntimeEntityType } from "./types.js";

const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "status", label: "Status" },
  { key: "specialAuthorities", label: "SPCAUT" },
  { key: "initialMenu", label: "INLMNU" },
  { key: "text", label: "TEXT" },
];

const SYSVAL_FIELDS = [{ key: "value", label: "VALUE" }];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatScalar(value: unknown): string {
  if (value === undefined || value === null || value === "") return "*NONE";
  const text = String(value);
  return text.length > 18 ? `${text.slice(0, 15)}...` : text;
}

export function summarizeStateChange(
  entityType: RuntimeEntityType,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string {
  const fields =
    entityType === "user_profile"
      ? PROFILE_FIELDS
      : entityType === "system_value"
        ? SYSVAL_FIELDS
        : [];

  const deltas: string[] = [];
  for (const field of fields) {
    const prev = formatScalar(before[field.key]);
    const next = formatScalar(after[field.key]);
    if (prev !== next) {
      deltas.push(`${field.label} ${prev}→${next}`);
    }
  }

  if (deltas.length === 0) {
    return `${entityId} updated`;
  }
  return deltas.join("; ");
}

export function formatEvidenceDiffLine(
  timestamp: string,
  entityType: RuntimeEntityType,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actor: string,
): string {
  const stamp = timestamp.replace("T", " ").slice(0, 19);
  const typeLabel =
    entityType === "user_profile"
      ? "USRPRF"
      : entityType === "system_value"
        ? "SYSVAL"
        : entityType.slice(0, 6).toUpperCase();
  const summary = summarizeStateChange(entityType, entityId, before, after);
  const line = `${stamp} ${typeLabel.padEnd(7)} ${entityId.padEnd(12)} ${summary} by ${actor}`;
  return line.length > 78 ? `${line.slice(0, 75)}...` : line;
}
