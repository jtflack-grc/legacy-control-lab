import { ebcdicToAsciiTrimmed } from "./ebcdic.js";

/** 5250 Attention Identifier (AID) key codes — RFC 1205 / IronTerm. */
export const AID_ENTER = 0xf1;
export const AID_HELP = 0xf3;
export const AID_ROLL_DOWN = 0xf4;
export const AID_ROLL_UP = 0xf5;
export const AID_PRINT = 0xf6;
export const AID_CLEAR = 0xbd;
export const AID_PF1 = 0x31;
export const AID_PF2 = 0x32;
export const AID_PF3 = 0x33;
export const AID_PF4 = 0x34;
export const AID_PF5 = 0x35;
export const AID_PF6 = 0x36;
export const AID_PF7 = 0x37;
export const AID_PF8 = 0x38;
export const AID_PF9 = 0x39;
export const AID_PF10 = 0x3a;
export const AID_PF11 = 0x3b;
export const AID_PF12 = 0x3c;
export const AID_PF13 = 0xb1;
export const AID_PF14 = 0xb2;
export const AID_PF15 = 0xb3;
export const AID_PF16 = 0xb4;
export const AID_PF17 = 0xb5;
export const AID_PF18 = 0xb6;
export const AID_PF19 = 0xb7;
export const AID_PF20 = 0xb8;
export const AID_PF21 = 0xb9;
export const AID_PF22 = 0xba;
export const AID_PF23 = 0xbb;
export const AID_PF24 = 0xbc;

export type AidKey =
  | "ENTER"
  | "HELP"
  | "CLEAR"
  | "PF1"
  | "PF2"
  | "PF3"
  | "PF4"
  | "PF5"
  | "PF6"
  | "PF7"
  | "PF8"
  | "PF9"
  | "PF10"
  | "PF11"
  | "PF12"
  | "PF13"
  | "PF14"
  | "PF15"
  | "PF16"
  | "PF17"
  | "PF18"
  | "PF19"
  | "PF20"
  | "PF21"
  | "PF22"
  | "PF23"
  | "PF24"
  | "ROLL_DOWN"
  | "ROLL_UP"
  | "UNKNOWN";

const AID_MAP: Record<number, AidKey> = {
  [AID_ENTER]: "ENTER",
  [AID_HELP]: "HELP",
  [AID_ROLL_DOWN]: "ROLL_DOWN",
  [AID_ROLL_UP]: "ROLL_UP",
  [AID_CLEAR]: "CLEAR",
  [AID_PF1]: "PF1",
  [AID_PF2]: "PF2",
  [AID_PF3]: "PF3",
  [AID_PF4]: "PF4",
  [AID_PF5]: "PF5",
  [AID_PF6]: "PF6",
  [AID_PF7]: "PF7",
  [AID_PF8]: "PF8",
  [AID_PF9]: "PF9",
  [AID_PF10]: "PF10",
  [AID_PF11]: "PF11",
  [AID_PF12]: "PF12",
  [AID_PF13]: "PF13",
  [AID_PF14]: "PF14",
  [AID_PF15]: "PF15",
  [AID_PF16]: "PF16",
  [AID_PF17]: "PF17",
  [AID_PF18]: "PF18",
  [AID_PF19]: "PF19",
  [AID_PF20]: "PF20",
  [AID_PF21]: "PF21",
  [AID_PF22]: "PF22",
  [AID_PF23]: "PF23",
  [AID_PF24]: "PF24",
};

export function aidCodeToKey(code: number): AidKey {
  return AID_MAP[code] ?? "UNKNOWN";
}

export type ParsedFieldInput = {
  address: number;
  row: number;
  col: number;
  value: string;
  fieldId?: string;
};

export type ParsedAidInput = {
  aid: AidKey;
  aidCode: number;
  cursorRow?: number;
  cursorCol?: number;
  fields: ParsedFieldInput[];
};

const ORDER_SBA = 0x11;

/** Parse IronTerm / IBM 5250 AID response: row, col, aid, [SBA row col data]* */
export function parseAidInput(
  data: Buffer,
  cols: number,
  resolveFieldId?: (row: number, col: number, address: number) => string | undefined,
  resolveFieldLength?: (fieldId: string) => number | undefined,
): ParsedAidInput {
  if (data.length < 3) {
    return { aid: "UNKNOWN", aidCode: 0, fields: [] };
  }

  const cursorRow = data[0] ?? 0;
  const cursorCol = data[1] ?? 0;
  const aidCode = data[2] ?? 0;
  const aid = aidCodeToKey(aidCode);
  let offset = 3;
  const fields: ParsedFieldInput[] = [];

  while (offset < data.length) {
    if (data[offset] !== ORDER_SBA) break;
    offset++;
    if (offset + 1 >= data.length) break;

    const row = data[offset] ?? 0;
    const col = data[offset + 1] ?? 0;
    offset += 2;
    const address = (row - 1) * cols + col;

    let fieldId = resolveFieldId?.(row, col, address);
    if (!fieldId) {
      fieldId = resolveFieldId?.(row, col + 1, address + 1);
    }
    if (!fieldId) {
      fieldId = resolveFieldId?.(row, col - 1, address - 1);
    }

    const fieldLength = fieldId ? resolveFieldLength?.(fieldId) : undefined;
    const fieldStart = offset;

    if (fieldLength !== undefined && fieldLength > 0) {
      let end = Math.min(fieldStart + fieldLength, data.length);
      for (let i = fieldStart; i < end; i++) {
        if (data[i] === ORDER_SBA) {
          end = i;
          break;
        }
      }
      offset = end;
    } else {
      while (offset < data.length && data[offset] !== ORDER_SBA) offset++;
    }

    const fieldData = data.subarray(fieldStart, offset);
    const value = fieldData.length > 0 ? ebcdicToAsciiTrimmed(fieldData) : "";

    fields.push({
      address,
      row,
      col,
      value,
      fieldId,
    });
  }

  return { aid, aidCode, cursorRow, cursorCol, fields };
}

function decodeFieldValue(data: Buffer): string {
  return ebcdicToAsciiTrimmed(data);
}

export { decodeFieldValue };
