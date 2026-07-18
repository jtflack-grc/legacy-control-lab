import {
  countCommands as countCommandsFromDb,
  getCommandByName as getCommandFromDb,
  listCommandsByStatus as listCommandsByStatusFromDb,
} from "../db/repositories/commandRepository.js";
import { formatLabMessage, getLabMessage } from "./messageCatalog.js";

/** IBM i CL command catalog — metadata loaded from SQLite (Phase 5). */

export const COMMAND_CATALOG_VERSION = "1.0.5";

export type CommandStatus =
  | "implemented"
  | "stubbed"
  | "cataloged"
  | "not_supported"
  | "out_of_scope";

export type CommandParameter = {
  name: string;
  type: string;
  default?: string;
  required: boolean;
  supportsSpecialValues: string[];
};

export type CommandDefinition = {
  name: string;
  displayName: string;
  category: string;
  status: CommandStatus;
  handler?: string;
  allowLimitedUser: boolean;
  requiresAuthority: string[];
  parameters: CommandParameter[];
};

export function getCommand(name: string): CommandDefinition | undefined {
  return getCommandFromDb(name);
}

export function listImplementedCommands(): CommandDefinition[] {
  return listCommandsByStatusFromDb("implemented");
}

export function countCatalogCommands(): number {
  return countCommandsFromDb();
}

export function catalogMessageForStatus(name: string, status: CommandStatus): string {
  switch (status) {
    case "out_of_scope":
      return formatLabMessage("LCL0902", { CMD: name });
    case "implemented":
      return `LCL0903 - Command ${name} handler is not available in this lab runtime.`;
    case "stubbed":
      return formatLabMessage("LCL0901", { CMD: name });
    case "cataloged":
    case "not_supported":
    default:
      return formatLabMessage("LCL0901", { CMD: name });
  }
}

export function unknownCommandMessage(name: string): string {
  const cataloged = getLabMessage("CPF0001");
  if (cataloged) {
    return formatLabMessage("CPF0001", { CMD: name });
  }
  return `CPF0001 - Command ${name} not found.`;
}
