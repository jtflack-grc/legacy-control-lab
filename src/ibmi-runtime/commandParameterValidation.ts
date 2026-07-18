import type { ParsedCommand } from "./commandParser.js";
import { getParameter } from "./commandParser.js";
import type { CommandDefinition } from "./commandCatalog.js";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { getCommandReference, specialValuesForParameter } from "../ibm74/referenceService.js";

export type ParameterValidationResult =
  | { ok: true }
  | { ok: false; message: string };

function missingParameterMessage(commandName: string, paramName: string): string {
  return `CPF0006 - Value for parameter ${paramName} required for command ${commandName}.`;
}

function invalidSpecialValueMessage(paramName: string, value: string, allowed: string[]): string {
  const list = allowed.join(" ");
  return `CPF0007 - Value '${value}' not valid for parameter ${paramName}. Valid values: ${list}.`;
}

/** Validates required parameters and declared special values using catalog metadata. */
export function validateCommandParameters(
  definition: CommandDefinition,
  parsed: ParsedCommand,
  catalogOverride?: ReturnType<typeof getCatalogCommand>,
): ParameterValidationResult {
  const catalog = catalogOverride ?? getCatalogCommand(definition.name);
  const reference = getCommandReference(definition.name);
  const refByName = new Map((reference?.parameters ?? []).map((param) => [param.name, param]));
  const parameters = (catalog?.parameters ?? definition.parameters).map((param) => {
    const refParam = refByName.get(param.name);
    return {
      name: param.name,
      type: param.type,
      required: param.required,
      supportsSpecialValues:
        refParam?.supportsSpecialValues ??
        param.supportsSpecialValues ??
        specialValuesForParameter(param.name, param.type),
    };
  });

  for (const param of parameters) {
    const value = getParameter(parsed, param.name);
    const required = param.required === true;
    if (required && (!value || value.trim() === "")) {
      return { ok: false, message: missingParameterMessage(definition.name, param.name) };
    }

    const allowed = param.supportsSpecialValues ?? [];
    if (value && allowed.length > 0) {
      const tokens = value.split(/\s+/).filter(Boolean);
      const enforceEnum = allowed.length <= 8 && tokens.every((token) => token.startsWith("*"));
      if (enforceEnum) {
        for (const token of tokens) {
          if (!allowed.includes(token)) {
            return { ok: false, message: invalidSpecialValueMessage(param.name, token, allowed) };
          }
        }
      }
    }
  }

  return { ok: true };
}
