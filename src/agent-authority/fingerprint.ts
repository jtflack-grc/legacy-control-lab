import { createHash } from "node:crypto";
import { canonicalize } from "./canonicalize.js";
import type { CanonicalAction, TargetKind } from "./types.js";

export function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

export function buildCanonicalAction(input: {
  targetKind: TargetKind; targetSystem: string; toolName: string;
  toolVersion: string; arguments: Record<string, unknown>;
}): CanonicalAction {
  return {
    schema_version: "1",
    target_kind: input.targetKind,
    target_system: normalizeIdentifier(input.targetSystem, "target system"),
    tool_name: input.toolName,
    tool_version: input.toolVersion,
    arguments: input.arguments,
  };
}

export function fingerprint(value: unknown): { canonicalJson: string; hash: string } {
  const canonicalJson = canonicalize(value);
  return { canonicalJson, hash: sha256(canonicalJson) };
}

export function normalizeIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`);
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_$#@]{1,10}$/.test(normalized)) throw new TypeError(`${label} is invalid`);
  return normalized;
}
