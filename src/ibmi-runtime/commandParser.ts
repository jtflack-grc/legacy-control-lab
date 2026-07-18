/** IBM i CL command parser (Phase 5 / Phase 2 hardening). */

export type ParsedCommand = {
  name: string;
  parameters: Record<string, string>;
  positionals: string[];
  raw: string;
};

const COMMAND_NAME_PATTERN = /^([A-Z][A-Z0-9]*)\b/i;

/** IBM i CL command verbs are case-insensitive (WRKACTJOB === wrkactjob). */
export function normalizeCommandVerb(verb: string): string {
  return verb.trim().toUpperCase();
}

export function parseCommand(input: string): ParsedCommand | null {
  const raw = input.trim();
  if (!raw) return null;

  const nameMatch = raw.match(COMMAND_NAME_PATTERN);
  if (!nameMatch?.[1]) return null;

  const name = nameMatch[1].toUpperCase();
  let remainder = raw.slice(nameMatch[0].length).trim();
  const parameters = parseKeywordParameters(remainder);
  remainder = stripKeywordParameters(remainder).trim();

  const positionals: string[] = [];
  if (remainder) {
    positionals.push(...remainder.split(/\s+/).map((token) => token.toUpperCase()));
  }

  return { name, parameters, positionals, raw };
}

function parseKeywordParameters(remainder: string): Record<string, string> {
  const parameters: Record<string, string> = {};
  let index = 0;

  while (index < remainder.length) {
    while (index < remainder.length && /\s/.test(remainder[index] ?? "")) index += 1;
    const keyMatch = remainder.slice(index).match(/^([A-Z][A-Z0-9]*)\(/i);
    if (!keyMatch?.[1]) break;

    const key = keyMatch[1].toUpperCase();
    index += keyMatch[0].length;

    let depth = 1;
    let cursor = index;
    let quote: "'" | '"' | null = null;

    while (cursor < remainder.length && depth > 0) {
      const ch = remainder[cursor] ?? "";
      if (quote) {
        if (ch === quote && remainder[cursor + 1] === quote) {
          cursor += 2;
          continue;
        }
        if (ch === quote) quote = null;
      } else if (ch === "'" || ch === '"') {
        quote = ch;
      } else if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }
      cursor += 1;
    }

    const rawValue = remainder.slice(index, Math.max(index, cursor - 1));
    parameters[key] = normalizeParameterValue(rawValue);
    index = cursor;
  }

  return parameters;
}

function stripKeywordParameters(remainder: string): string {
  let index = 0;
  let output = "";

  while (index < remainder.length) {
    while (index < remainder.length && /\s/.test(remainder[index] ?? "")) {
      output += remainder[index] ?? "";
      index += 1;
    }
    const keyMatch = remainder.slice(index).match(/^([A-Z][A-Z0-9]*)\(/i);
    if (!keyMatch) {
      output += remainder.slice(index);
      break;
    }

    index += keyMatch[0].length;
    let depth = 1;
    let cursor = index;
    let quote: "'" | '"' | null = null;

    while (cursor < remainder.length && depth > 0) {
      const ch = remainder[cursor] ?? "";
      if (quote) {
        if (ch === quote && remainder[cursor + 1] === quote) {
          cursor += 2;
          continue;
        }
        if (ch === quote) quote = null;
      } else if (ch === "'" || ch === '"') {
        quote = ch;
      } else if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
      }
      cursor += 1;
    }
    index = cursor;
  }

  return output;
}

export function normalizeParameterValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const quote = trimmed[0];
  if ((quote === "'" || quote === '"') && trimmed.endsWith(quote) && trimmed.length >= 2) {
    const inner = trimmed.slice(1, -1);
    if (quote === "'") {
      return inner.replace(/''/g, "'");
    }
    return inner.replace(/""/g, '"');
  }

  return trimmed.toUpperCase();
}

export function getParameter(command: ParsedCommand, name: string): string | undefined {
  return command.parameters[name.toUpperCase()];
}

export function getQualifiedObject(command: ParsedCommand, paramName = "OBJ"): { library?: string; object?: string } {
  const value = getParameter(command, paramName);
  if (!value) return {};
  const slash = value.indexOf("/");
  if (slash === -1) return { object: value };
  return {
    library: value.slice(0, slash),
    object: value.slice(slash + 1),
  };
}
