import type { ScreenBuffer } from "../screen-runtime/screenBuffer.js";
import type { ScreenField } from "../screen-runtime/screen.js";
import { IBM_5250_ATTR, resolve5250Attribute } from "../screen-runtime/ibm5250Attributes.js";
import { asciiToEbcdic } from "./ebcdic.js";

/** Telnet IAC constants */
export const IAC = 0xff;
export const EOR = 0xef;

/** GDS constants (IronTerm / RFC 1205) */
export const GDS_HEADER_LEN = 10;
export const GDS_TYPE_HI = 0x12;
export const GDS_TYPE_LO = 0xa0;

export const GdsOp = {
  NO_OPERATION: 0x00,
  INVITE_OPERATION: 0x01,
  OUTPUT_ONLY: 0x02,
  PUT_GET_OPERATION: 0x03,
} as const;

export const Cmd = {
  WRITE_TO_DISPLAY: 0x11,
  READ_INPUT_FIELDS: 0x42,
  CLEAR_UNIT: 0x40,
} as const;

export const Order = {
  ESC: 0x04,
  SBA: 0x11,
  IC: 0x13,
  SF: 0x1d,
} as const;

export type TerminalDimensions = {
  rows: number;
  cols: number;
};

const TERMINAL_DIMENSIONS: Record<string, TerminalDimensions> = {
  "IBM-5251-11": { rows: 24, cols: 80 },
  "IBM-5291-1": { rows: 24, cols: 80 },
  "IBM-5292-2": { rows: 24, cols: 80 },
  "IBM-3196-A1": { rows: 24, cols: 80 },
  "IBM-3179-2": { rows: 24, cols: 80 },
  "IBM-3180-2": { rows: 27, cols: 132 },
  "IBM-3477-FC": { rows: 27, cols: 132 },
  "IBM-3477-FG": { rows: 27, cols: 132 },
};

export function getTerminalDimensions(terminalType: string): TerminalDimensions {
  return TERMINAL_DIMENSIONS[terminalType] ?? { rows: 24, cols: 80 };
}

/** Wrap payload in 10-byte GDS header + IAC EOR (IronTerm format). */
export function wrapGds(
  payload: Buffer,
  opcode: number,
  flags = 0,
  miscFlags1 = 0x00,
  miscFlags2 = 0x00,
): Buffer {
  const total = GDS_HEADER_LEN + payload.length;
  const header = Buffer.alloc(GDS_HEADER_LEN);
  header.writeUInt16BE(total, 0);
  header.writeUInt16BE((GDS_TYPE_HI << 8) | GDS_TYPE_LO, 2);
  header[4] = miscFlags1;
  header[5] = miscFlags2;
  header[6] = 0x04;
  header[7] = flags & 0xff;
  header[8] = 0x00;
  header[9] = opcode & 0xff;
  return appendTelnetEor(Buffer.concat([header, payload]));
}

/** IBM i startup confirmation record (miscFlags1 = 0x80). */
export function buildStartupConfirmation(systemName: string, deviceName: string): Buffer {
  const text = `${systemName.padEnd(10)} ${deviceName.padEnd(10)}`;
  const payload = asciiToEbcdic(text);
  return wrapGds(payload, GdsOp.NO_OPERATION, 0, 0x80, 0x00);
}

function fieldAttr(field: ScreenField): number {
  return resolve5250Attribute(field);
}

function appendEsc(orders: number[]): void {
  orders.push(Order.ESC);
}

function appendSba(orders: number[], row: number, col: number): void {
  orders.push(Order.SBA, row & 0xff, col & 0xff);
}

function appendRowText(orders: number[], row: number, col: number, text: string, attr: number): void {
  appendSba(orders, row, Math.max(1, col - 1));
  orders.push(attr);
  for (const b of asciiToEbcdic(text)) orders.push(b);
}

function appendEraseDisplay(orders: number[], rows: number, cols: number): void {
  const blank = " ".repeat(cols);
  for (let row = 1; row <= rows; row++) {
    appendRowText(orders, row, 1, blank, IBM_5250_ATTR.GREEN);
  }
}

function appendOutputText(orders: number[], row: number, col: number, field: ScreenField): void {
  const text = (field.value ?? "").padEnd(field.length, " ").slice(0, field.length);
  appendRowText(orders, row, col, text, fieldAttr(field));
}

/** IBM 5250 FFW byte 2 bit 0x20 — force typed alpha to uppercase (sign-on user id). */
const FFW_MONOCASE = 0x20;

function inputFieldFfw1(field: ScreenField): number {
  if (field.preserveCase) return 0x00;
  if (field.id === "USER" || field.id === "USERNAME") return FFW_MONOCASE;
  return 0x00;
}

function appendInputField(orders: number[], row: number, col: number, field: ScreenField): void {
  appendSba(orders, row, col);
  const hidden = field.nonDisplay || field.type === "password";
  const attr = hidden ? IBM_5250_ATTR.NON_DISPLAY : fieldAttr(field);
  const ffw1 = hidden ? 0x00 : inputFieldFfw1(field);
  // 0x40 = extended FFW, 0x08 = MDT so IronTerm always includes the field on Enter.
  orders.push(Order.SF, 0x48, ffw1, attr, (field.length >> 8) & 0xff, field.length & 0xff);
}

/** Pre-fill input field data so F9 retrieve and menu command echo are visible in IronTerm. */
function appendInputFieldData(orders: number[], row: number, col: number, field: ScreenField): void {
  const trimmed = (field.value ?? "").trim();
  if (!trimmed) return;
  const text = (field.value ?? "").padEnd(field.length, " ").slice(0, field.length);
  appendSba(orders, row, col + 1);
  for (const b of asciiToEbcdic(text)) {
    orders.push(b);
  }
}

/** Build IronTerm-compatible 5250 command payload for a full screen. */
export function buildScreenPayload(fields: ScreenField[]): Buffer {
  const orders: number[] = [];
  let firstInput: { row: number; col: number } | undefined;
  let signonUserInput: { row: number; col: number } | undefined;
  let commandLineInput: { row: number; col: number } | undefined;
  let subfileOptInput: { row: number; col: number } | undefined;

  appendEsc(orders);
  orders.push(Cmd.CLEAR_UNIT);

  appendEsc(orders);
  orders.push(Cmd.WRITE_TO_DISPLAY, 0x00, 0x08);
  appendEraseDisplay(orders, 24, 80);

  for (const field of fields) {
    const isInput =
      !field.protected ||
      field.type === "input" ||
      field.type === "password" ||
      field.type === "command";

    if (isInput) {
      appendInputField(orders, field.row, field.col, field);
      appendInputFieldData(orders, field.row, field.col, field);
      if (field.type === "input" || field.type === "password" || field.type === "command") {
        const cursor = { row: field.row, col: field.col + 1 };
        if (field.id === "USER" || field.id === "USERNAME") {
          signonUserInput = cursor;
        } else if (field.id === "COMMAND" || field.id === "SUBFILE_CMD" || field.id === "QSH_CMD") {
          commandLineInput = cursor;
        } else if (/^(OPT|SOPT|OOPT|JOPT|SPLT|FOPT|LOPT|WOPT|NOPT|DOPT|MOPT|PGOPT|PTOPT|NIFC|NCNN)0$/.test(field.id)) {
          subfileOptInput = cursor;
        } else if (/^MRPY\d+$/.test(field.id)) {
          if (!firstInput) firstInput = cursor;
        } else if (!firstInput) {
          firstInput = cursor;
        }
      }
    } else if (field.value !== undefined && field.value.length > 0) {
      appendOutputText(orders, field.row, field.col, field);
    }
  }

  const cursor = signonUserInput ?? subfileOptInput ?? commandLineInput ?? firstInput;
  if (cursor) {
    orders.push(Order.IC, cursor.row & 0xff, cursor.col & 0xff);
  }

  orders.push(Order.ESC);

  appendEsc(orders);
  orders.push(Cmd.READ_INPUT_FIELDS, 0x00, 0x08);

  return Buffer.from(orders);
}

export function buildScreenGds(fields: ScreenField[]): Buffer {
  const payload = buildScreenPayload(fields);
  return wrapGds(payload, GdsOp.INVITE_OPERATION);
}

export function buildScreenGdsFromBuffer(buffer: ScreenBuffer, fields: ScreenField[]): Buffer {
  return buildScreenGds(fields);
}

export function appendTelnetEor(data: Buffer): Buffer {
  return Buffer.concat([data, Buffer.from([IAC, EOR])]);
}

export function stripTelnetEscapes(data: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0;
    if (byte === IAC) {
      if (i + 1 < data.length) {
        const cmd = data[i + 1] ?? 0;
        if (cmd === EOR) break;
        if (cmd === IAC) {
          out.push(IAC);
          i++;
          continue;
        }
        i++;
        if (cmd >= 0xfb && cmd <= 0xfe && i + 1 < data.length) i++;
        continue;
      }
    }
    out.push(byte);
  }
  return Buffer.from(out);
}

export function formatFrameHex(data: Buffer): string {
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

export function unwrapGds(data: Buffer): {
  opcode: number;
  flags: number;
  miscFlags1: number;
  payload: Buffer;
} | null {
  if (data.length < GDS_HEADER_LEN) return null;
  if (data[2] !== GDS_TYPE_HI || data[3] !== GDS_TYPE_LO) return null;
  const varHdr = data[6] ?? 4;
  const dataStart = 6 + varHdr;
  if (dataStart > data.length) return null;
  return {
    opcode: data[9] ?? 0,
    flags: data[7] ?? 0,
    miscFlags1: data[4] ?? 0,
    payload: data.subarray(dataStart),
  };
}
