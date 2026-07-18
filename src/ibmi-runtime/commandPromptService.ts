import type { ParsedCommand } from "./commandParser.js";
import { parseCommand } from "./commandParser.js";
import type { IbmiSession } from "./sessionService.js";
import { getCatalogCommand, loadFullCommandCatalog } from "../catalog/commandCatalogService.js";
import {
  buildCommandFromPrompt,
  createCommandListScreen,
  createCommandPromptScreen,
} from "../screen-runtime/screens/commandPrompt.js";
import type { ScreenDefinition } from "../screen-runtime/screen.js";
import type { MenuRouteResult } from "./commandHandlers.js";

export type PromptContext = {
  commandName: string;
  values: Record<string, string>;
};

export function parsePartialCommandValues(rawInput: string): { commandName?: string; values: Record<string, string> } {
  const parsed = parseCommand(rawInput);
  if (!parsed) {
    const token = rawInput.trim().split(/\s+/)[0]?.toUpperCase();
    return { commandName: token, values: {} };
  }
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.parameters)) {
    values[key.toUpperCase()] = value;
  }
  return { commandName: parsed.name, values };
}

export function openCommandPrompt(
  session: IbmiSession,
  rawInput: string,
): MenuRouteResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      kind: "screen",
      screen: createCommandListScreen(session.systemName, loadFullCommandCatalog()),
    };
  }

  const { commandName, values } = parsePartialCommandValues(trimmed);
  if (!commandName) {
    return { kind: "message", message: "CPF0006 - Command name required for prompt." };
  }

  const command = getCatalogCommand(commandName);
  if (!command) {
    return { kind: "message", message: `CPF0001 - Command ${commandName} not found.` };
  }

  session.promptContext = { commandName: command.name, values };
  return {
    kind: "screen",
    screen: createCommandPromptScreen(session.systemName, command, values),
  };
}

export function submitCommandPrompt(
  session: IbmiSession,
  fields: Record<string, string>,
  command: ReturnType<typeof getCatalogCommand>,
): { commandText: string; screen: ScreenDefinition } | undefined {
  if (!command) return undefined;
  const values: Record<string, string> = { ...(session.promptContext?.values ?? {}) };
  (command.parameters ?? []).forEach((param, index) => {
    const fieldValue = fields[`P${index}`]?.trim();
    if (fieldValue) values[param.name.toUpperCase()] = fieldValue;
  });
  session.promptContext = undefined;
  return {
    commandText: buildCommandFromPrompt(command, values),
    screen: createCommandPromptScreen(session.systemName, command, values),
  };
}

export function extractMessageId(message: string): string | undefined {
  const match = message.match(/\b(CPF|CPI|LCL)\d{4}\b/);
  return match?.[0];
}
