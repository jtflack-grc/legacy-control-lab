import { IAC, EOR } from "./gds.js";

export { IAC, EOR };

/** Telnet option codes */
export const OPT_BINARY = 0x00;
export const OPT_EOR = 0x19;
export const OPT_TERMINAL_TYPE = 0x18;
export const OPT_NEW_ENVIRON = 0x27;

/** Telnet command codes */
export const CMD_WILL = 0xfb;
export const CMD_WONT = 0xfc;
export const CMD_DO = 0xfd;
export const CMD_DONT = 0xfe;
export const CMD_SB = 0xfa;
export const CMD_SE = 0xf0;

/** NEW-ENVIRON subnegotiation (RFC 1572) */
export const NE_IS = 0x00;
export const NE_SEND = 0x01;
export const NE_USERVAR = 0x03;

export const SUPPORTED_TERMINAL_TYPES = [
  "IBM-5251-11",
  "IBM-5292-2",
  "IBM-3179-2",
  "IBM-3477-FC",
] as const;

export type SupportedTerminalType = (typeof SUPPORTED_TERMINAL_TYPES)[number];

export type NegotiationState = {
  binary: boolean;
  eor: boolean;
  terminalType?: string;
  newEnviron: boolean;
  complete: boolean;
};

export function createNegotiationState(): NegotiationState {
  return { binary: false, eor: false, newEnviron: false, complete: false };
}

export function initialServerOffers(): Buffer {
  return Buffer.from([
    IAC, CMD_WILL, OPT_BINARY,
    IAC, CMD_DO, OPT_BINARY,
    IAC, CMD_WILL, OPT_EOR,
    IAC, CMD_DO, OPT_EOR,
    IAC, CMD_DO, OPT_TERMINAL_TYPE,
    IAC, CMD_DO, OPT_NEW_ENVIRON,
  ]);
}

export function buildNewEnvironSend(): Buffer {
  return Buffer.from([IAC, CMD_SB, OPT_NEW_ENVIRON, NE_SEND, IAC, CMD_SE]);
}

export function buildTerminalTypeSend(): Buffer {
  return Buffer.from([IAC, CMD_SB, OPT_TERMINAL_TYPE, 0x01, IAC, CMD_SE]);
}

export function processTelnetData(
  data: Buffer,
  state: NegotiationState,
): { responses: Buffer[]; remaining: Buffer; negotiationComplete: boolean } {
  const responses: Buffer[] = [];
  let i = 0;

  while (i < data.length) {
    if (data[i] !== IAC) break;

    const cmd = data[i + 1];
    if (cmd === undefined) break;

    if (cmd === IAC) {
      i += 2;
      continue;
    }

    if (cmd === CMD_WILL || cmd === CMD_WONT) {
      const opt = data[i + 2];
      if (opt === undefined) break;
      if (cmd === CMD_WILL) {
        if (opt === OPT_BINARY || opt === OPT_EOR) {
          responses.push(Buffer.from([IAC, CMD_DO, opt]));
          if (opt === OPT_BINARY) state.binary = true;
          if (opt === OPT_EOR) state.eor = true;
        } else if (opt === OPT_TERMINAL_TYPE || opt === OPT_NEW_ENVIRON) {
          responses.push(Buffer.from([IAC, CMD_DO, opt]));
          if (opt === OPT_TERMINAL_TYPE && state.terminalType === undefined) {
            responses.push(buildTerminalTypeSend());
          }
          if (opt === OPT_NEW_ENVIRON && !state.newEnviron) {
            state.newEnviron = true;
            responses.push(buildNewEnvironSend());
          }
        } else {
          responses.push(Buffer.from([IAC, CMD_DONT, opt]));
        }
      } else {
        responses.push(Buffer.from([IAC, CMD_DONT, opt]));
      }
      i += 3;
      continue;
    }

    if (cmd === CMD_DO || cmd === CMD_DONT) {
      const opt = data[i + 2];
      if (opt === undefined) break;
      if (cmd === CMD_DO) {
        if (opt === OPT_BINARY || opt === OPT_EOR || opt === OPT_NEW_ENVIRON) {
          responses.push(Buffer.from([IAC, CMD_WILL, opt]));
          if (opt === OPT_BINARY) state.binary = true;
          if (opt === OPT_EOR) state.eor = true;
          if (opt === OPT_NEW_ENVIRON) state.newEnviron = true;
        } else if (opt === OPT_TERMINAL_TYPE) {
          responses.push(Buffer.from([IAC, CMD_WILL, opt]));
        } else {
          responses.push(Buffer.from([IAC, CMD_WONT, opt]));
        }
      } else {
        responses.push(Buffer.from([IAC, CMD_WONT, opt]));
      }
      i += 3;
      continue;
    }

    if (cmd === CMD_SB) {
      const end = findSubnegotiationEnd(data, i);
      if (end < 0) break;
      const sub = data.subarray(i, end + 1);
      const subResponse = handleSubnegotiation(sub, state);
      if (subResponse) responses.push(subResponse);
      i = end + 1;
      continue;
    }

    i += 2;
  }

  const remaining = data.subarray(i);
  const negotiationComplete =
    state.binary &&
    state.eor &&
    state.terminalType !== undefined &&
    state.newEnviron;

  if (negotiationComplete) state.complete = true;

  return { responses, remaining, negotiationComplete };
}

function findSubnegotiationEnd(data: Buffer, start: number): number {
  for (let j = start + 2; j < data.length - 1; j++) {
    if (data[j] === IAC && data[j + 1] === CMD_SE) return j + 1;
  }
  return -1;
}

function handleSubnegotiation(sub: Buffer, state: NegotiationState): Buffer | null {
  if (sub.length < 4) return null;
  const opt = sub[2];

  if (opt === OPT_TERMINAL_TYPE) {
    const typeByte = sub[3];
    if (typeByte === 0x01) {
      return null;
    }
    if (typeByte === 0x00) {
      const nameEnd = sub.length - 2;
      state.terminalType = normalizeTerminalType(sub.subarray(4, nameEnd).toString("ascii"));
    }
    return null;
  }

  if (opt === OPT_NEW_ENVIRON) {
    const verb = sub[3];
    if (verb === NE_IS) {
      state.newEnviron = true;
    }
    return null;
  }

  return null;
}

export function normalizeTerminalType(termType: string): string {
  const trimmed = termType.trim().toUpperCase();
  for (const supported of SUPPORTED_TERMINAL_TYPES) {
    if (trimmed.includes(supported.replace("IBM-", "")) || trimmed === supported) {
      return supported;
    }
  }
  if (trimmed.includes("3477")) return "IBM-3477-FC";
  if (trimmed.includes("5292")) return "IBM-5292-2";
  if (trimmed.includes("3179")) return "IBM-3179-2";
  if (trimmed.includes("5251")) return "IBM-5251-11";
  return "IBM-5292-2";
}

export function isNegotiationData(data: Buffer): boolean {
  return data.length > 0 && data[0] === IAC;
}

export function extract5250Records(data: Buffer): Buffer[] {
  const records: Buffer[] = [];
  let start = 0;

  for (let i = 0; i < data.length - 1; i++) {
    if (data[i] === IAC && data[i + 1] === EOR) {
      records.push(data.subarray(start, i));
      start = i + 2;
    }
  }

  if (start < data.length) {
    const tail = data.subarray(start);
    if (tail.length > 0 && tail[0] !== IAC) records.push(tail);
  }

  return records;
}
