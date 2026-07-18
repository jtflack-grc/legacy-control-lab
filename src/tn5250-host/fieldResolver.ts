import type { ScreenBuffer } from "../screen-runtime/screenBuffer.js";
import type { ScreenDefinition, ScreenField } from "../screen-runtime/screen.js";
import type { ParsedAidInput } from "./aid.js";

import { SUBFILE_OPTION_FIELD_PATTERN } from "../screen-runtime/screens/screenHelpers.js";

const SUBFILE_OPT_PATTERN = SUBFILE_OPTION_FIELD_PATTERN;

function isInputField(field: ScreenField): boolean {
  return (
    !field.protected ||
    field.type === "input" ||
    field.type === "password" ||
    field.type === "command"
  );
}

/** IBM SF input fields: attribute at field.col, data in field.length cells starting at col+1. */
export function inputDataColumn(field: ScreenField): number {
  return field.col + 1;
}

export function resolveScreenFieldId(
  screen: ScreenDefinition,
  buffer: ScreenBuffer,
  row: number,
  col: number,
  address: number,
): string | undefined {
  for (const delta of [0, -1, 1, -2, 2]) {
    const id = buffer.getFieldIdAtAddress(address + delta);
    if (id) return id;
  }

  for (const field of screen.fields) {
    if (!isInputField(field)) continue;

    const dataStart = inputDataColumn(field);
    const dataEnd = dataStart + field.length - 1;
    if (row === field.row && col >= field.col && col <= dataEnd) {
      return field.id;
    }
  }

  return undefined;
}

function findSubfileOptOnRow(screen: ScreenDefinition, row: number): ScreenField | undefined {
  return screen.fields.find(
    (field) => SUBFILE_OPT_PATTERN.test(field.id) && field.row === row,
  );
}

export function enrichSubfileValues(
  screen: ScreenDefinition,
  parsed: ParsedAidInput,
  values: Record<string, string>,
): Record<string, string> {
  if (!isSubfileScreen(screen.id)) return values;

  const enriched = { ...values };

  for (const field of parsed.fields) {
    if (field.fieldId) continue;
    const trimmed = field.value.trim();
    if (!/^\d{1,2}$/.test(trimmed)) continue;
    const optField = findSubfileOptOnRow(screen, field.row);
    if (optField) enriched[optField.id] = field.value;
  }

  const cmd = enriched.SUBFILE_CMD?.trim() ?? "";
  if (/^\d{1,2}$/.test(cmd) && parsed.cursorRow) {
    const optField = findSubfileOptOnRow(screen, parsed.cursorRow);
    if (optField) {
      enriched[optField.id] = cmd.padEnd(optField.length, " ");
      delete enriched.SUBFILE_CMD;
    }
  }

  return enriched;
}

export function mapScreenFieldValues(
  screen: ScreenDefinition,
  buffer: ScreenBuffer,
  parsed: ParsedAidInput,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of parsed.fields) {
    const fieldId =
      field.fieldId ??
      resolveScreenFieldId(screen, buffer, field.row, field.col, field.address);
    if (fieldId) {
      values[fieldId] = field.value;
    }
  }

  if (parsed.cursorRow && parsed.cursorCol) {
    const cursorId = resolveScreenFieldId(
      screen,
      buffer,
      parsed.cursorRow,
      parsed.cursorCol,
      buffer.bufferAddress(parsed.cursorRow, parsed.cursorCol),
    );
    if (cursorId && values[cursorId] === undefined) {
      const cursorField = parsed.fields.find(
        (entry) => entry.row === parsed.cursorRow && entry.col === parsed.cursorCol,
      );
      if (cursorField) values[cursorId] = cursorField.value;
    }
  }

  for (const field of parsed.fields) {
    if (field.fieldId) continue;
    const trimmed = field.value.trim();
    if (!trimmed) continue;

    for (const screenField of screen.fields) {
      if (!SUBFILE_OPT_PATTERN.test(screenField.id)) continue;
      if (screenField.row !== field.row) continue;
      if (field.col < screenField.col || field.col > inputDataColumn(screenField) + screenField.length - 1) {
        continue;
      }
      values[screenField.id] = field.value;
      break;
    }
  }

  return enrichSubfileValues(screen, parsed, values);
}

export function isSubfileScreen(screenId: ScreenDefinition["id"]): boolean {
  return new Set<ScreenDefinition["id"]>([
    "WRKUSRPRF",
    "WRKSYSVAL",
    "DSPSYSVAL",
    "WRKOBJ",
    "WRKOBJOWN",
    "EDTAUTL",
    "DSPJRN",
    "DSPSECAUD",
    "DSPAUDJRNE",
    "WRKACTJOB",
    "WRKJOB",
    "WRKSBSJOB",
    "WRKUSRJOB",
    "WRKDSKSTS",
    "WRKSBMJOB",
    "WRKJOBQ",
    "WRKSPLF",
    "DSPFFD",
    "WRKLNK",
    "WRKRANGE",
    "WRKCMPGN",
    "WRKCMPMSN",
    "WRKSCORE",
    "WRKSCN",
    "WORKSHOP",
    "DSPMSG",
    "DSPMSGINT",
    "WRKPTFGRP",
    "WRKPTF",
    "DSPPTFGRP",
    "WRKSQLSVC",
    "WRKMBRPDM",
    "WRKOBJPDM",
  ]).has(screenId);
}
