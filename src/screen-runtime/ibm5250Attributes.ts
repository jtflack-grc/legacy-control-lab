import type { ScreenField } from "./screen.js";
import { isSubfileOptionField } from "./screens/screenHelpers.js";

/**
 * IBM 5250 display attribute bytes (5250 Functions Reference / IronTerm ATTR_BASE).
 * Default session color is green; titles, column headers, and banners use white (HI).
 */
export const IBM_5250_ATTR = {
  GREEN: 0x20,
  GREEN_REVERSE: 0x21,
  WHITE: 0x22,
  WHITE_REVERSE: 0x23,
  GREEN_UNDERLINE: 0x24,
  WHITE_UNDERLINE: 0x26,
  NON_DISPLAY: 0x27,
  RED: 0x28,
  RED_UNDERLINE: 0x2c,
  TURQUOISE: 0x30,
  YELLOW: 0x32,
  PINK: 0x38,
  BLUE: 0x3a,
} as const;

const PROTECTED_COLOR: Record<NonNullable<ScreenField["color"]>, number> = {
  green: IBM_5250_ATTR.GREEN,
  white: IBM_5250_ATTR.WHITE,
  red: IBM_5250_ATTR.RED,
  turquoise: IBM_5250_ATTR.TURQUOISE,
  yellow: IBM_5250_ATTR.YELLOW,
  pink: IBM_5250_ATTR.PINK,
  blue: IBM_5250_ATTR.BLUE,
};

const INPUT_COLOR: Record<NonNullable<ScreenField["color"]>, number> = {
  green: IBM_5250_ATTR.GREEN,
  white: IBM_5250_ATTR.WHITE_UNDERLINE,
  red: IBM_5250_ATTR.RED_UNDERLINE,
  turquoise: IBM_5250_ATTR.TURQUOISE,
  yellow: IBM_5250_ATTR.YELLOW,
  pink: IBM_5250_ATTR.PINK,
  blue: IBM_5250_ATTR.BLUE,
};

/** Resolve a screen field to the 5250 attribute byte sent to the terminal. */
export function resolve5250Attribute(field: ScreenField): number {
  if (field.nonDisplay || field.type === "password") {
    return IBM_5250_ATTR.NON_DISPLAY;
  }

  const isInput =
    !field.protected || field.type === "input" || field.type === "command";

  if (isInput) {
    if (isSubfileOptionField(field)) return IBM_5250_ATTR.GREEN_UNDERLINE;
    if (field.color) return INPUT_COLOR[field.color];
    return IBM_5250_ATTR.GREEN;
  }

  if (field.color) return PROTECTED_COLOR[field.color];
  if (field.intensity === "high") return IBM_5250_ATTR.WHITE;
  return IBM_5250_ATTR.GREEN;
}
