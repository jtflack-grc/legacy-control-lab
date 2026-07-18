import type { ScreenDefinition } from "./screen.js";
import { IBM_5250_ATTR } from "./ibm5250Attributes.js";
import { ScreenBuffer } from "./screenBuffer.js";
import { formatSubfileOptionValue, isSubfileOptionField } from "./screens/screenHelpers.js";

export function renderScreenToBuffer(screen: ScreenDefinition): ScreenBuffer {
  const buffer = new ScreenBuffer(screen.rows, screen.cols);
  buffer.clear();

  if (screen.messageLine) {
    buffer.putText(24, 1, screen.messageLine.slice(0, screen.cols), IBM_5250_ATTR.RED);
  }

  for (const field of screen.fields) {
    buffer.putField(field);
  }

  return buffer;
}

export function applyFieldValues(
  screen: ScreenDefinition,
  values: Record<string, string>,
): ScreenDefinition {
  return {
    ...screen,
    fields: screen.fields.map((field) => {
      const next = values[field.id] ?? field.value ?? "";
      return {
        ...field,
        value: isSubfileOptionField(field)
          ? formatSubfileOptionValue(field.length, next)
          : next,
      };
    }),
  };
}

export function withMessageLine(
  screen: ScreenDefinition,
  messageLine: string,
): ScreenDefinition {
  return { ...screen, messageLine };
}
