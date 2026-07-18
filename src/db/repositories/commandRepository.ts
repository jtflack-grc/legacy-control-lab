import { getDatabase } from "../sqlite.js";
import type { CommandDefinition, CommandParameter, CommandStatus } from "../../ibmi-runtime/commandCatalog.js";

type CommandRow = {
  id: string;
  name: string;
  displayName: string | null;
  category: string | null;
  status: CommandStatus;
  handler: string | null;
  allowLimitedUser: number;
  requiresAuthority: string | null;
};

type ParameterRow = {
  name: string;
  paramType: string | null;
  defaultValue: string | null;
  required: number;
  supportsSpecialValues: string | null;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapCommand(row: CommandRow, parameters: CommandParameter[]): CommandDefinition {
  return {
    name: row.name,
    displayName: row.displayName ?? row.name,
    category: row.category ?? "general",
    status: row.status,
    handler: row.handler ?? undefined,
    allowLimitedUser: row.allowLimitedUser !== 0,
    requiresAuthority: parseJsonArray(row.requiresAuthority),
    parameters,
  };
}

export function getCommandByName(name: string): CommandDefinition | undefined {
  const row = getDatabase()
    .prepare(
      `SELECT id, name, display_name AS displayName, category, status, handler,
              allow_limited_user AS allowLimitedUser, requires_authority AS requiresAuthority
       FROM commands WHERE name = ?`,
    )
    .get(name.trim().toUpperCase()) as CommandRow | undefined;

  if (!row) return undefined;

  const parameters = listParametersForCommand(row.id);
  return mapCommand(row, parameters);
}

export function listCommandsByStatus(status: CommandStatus): CommandDefinition[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, name, display_name AS displayName, category, status, handler,
              allow_limited_user AS allowLimitedUser, requires_authority AS requiresAuthority
       FROM commands WHERE status = ? ORDER BY name`,
    )
    .all(status) as CommandRow[];

  return rows.map((row) => mapCommand(row, listParametersForCommand(row.id)));
}

export function countCommands(): number {
  const row = getDatabase().prepare("SELECT COUNT(*) AS count FROM commands").get() as { count: number };
  return row.count;
}

function listParametersForCommand(commandId: string): CommandParameter[] {
  const rows = getDatabase()
    .prepare(
      `SELECT name, param_type AS paramType, default_value AS defaultValue,
              required, supports_special_values AS supportsSpecialValues
       FROM command_parameters
       WHERE command_id = ?
       ORDER BY name`,
    )
    .all(commandId) as ParameterRow[];

  return rows.map((row) => ({
    name: row.name,
    type: row.paramType ?? "generic",
    default: row.defaultValue ?? undefined,
    required: row.required !== 0,
    supportsSpecialValues: parseJsonArray(row.supportsSpecialValues),
  }));
}
