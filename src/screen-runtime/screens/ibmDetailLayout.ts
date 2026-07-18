import type { ScreenField } from "../screen.js";
import { outputField } from "./screenHelpers.js";

/** IBM i detail panel — label at col 6, colon at col 45, value at col 47 (QUSRSRAA-style). */
export const IBM_DETAIL_LABEL_COL = 6;
export const IBM_DETAIL_COLON_COL = 45;
export const IBM_DETAIL_VALUE_COL = 47;
export const IBM_DETAIL_VALUE_LEN = 33;

const LABEL_WIDTH = IBM_DETAIL_COLON_COL - IBM_DETAIL_LABEL_COL + 1;

/** Build a dotted label ending with ":" aligned at IBM_DETAIL_COLON_COL. */
export function ibmDottedLabel(label: string): string {
  const name = label.trim();
  const prefix = `${name} `;
  const dotCount = Math.max(0, LABEL_WIDTH - prefix.length - 1);
  let dots = "";
  while (dots.length < dotCount) {
    dots += dots.length + 1 < dotCount ? ". " : ".";
  }
  return `${prefix}${dots.slice(0, dotCount)}:`;
}

export function ibmDetailFields(
  row: number,
  id: string,
  label: string,
  value: string,
): ScreenField[] {
  const text = value.slice(0, IBM_DETAIL_VALUE_LEN);
  return [
    outputField(`${id}_LBL`, row, IBM_DETAIL_LABEL_COL, ibmDottedLabel(label)),
    outputField(id, row, IBM_DETAIL_VALUE_COL, text.padEnd(IBM_DETAIL_VALUE_LEN)),
  ];
}

/** WRKUSRPRF subfile column positions (IBM work-with user profiles panel). */
export const WRKUSRPRF_COLUMNS = {
  opt: 6,
  profile: 10,
  status: 21,
  group: 32,
  special: 43,
  signon: 63,
} as const;

export const WRKUSRPRF_WIDTHS = {
  profile: 10,
  status: 10,
  group: 10,
  special: 19,
  signon: 8,
} as const;

export function wrkUsrPrfCell(value: string, width: number): string {
  return value.slice(0, width).padEnd(width);
}

/** WRKACTJOB subfile columns (QWACTJOB / IBM i 7.4 panel positions). */
export const WRKACTJOB_COLUMNS = {
  opt: 6,
  name: 10,
  jobName: 12,
  user: 27,
  type: 38,
  cpu: 43,
  function: 49,
  status: 66,
} as const;

export const WRKACTJOB_WIDTHS = {
  opt: 2,
  name: 16,
  user: 10,
  type: 4,
  cpu: 5,
  function: 16,
  status: 8,
} as const;

export function wrkActJobCell(value: string, width: number): string {
  return value.slice(0, width).padEnd(width);
}

/** CPU % in the 5-character WRKACTJOB column — decimals align (e.g. "  .0", "  3.1"). */
export function wrkActJobCpuCell(cpu: number): string {
  const raw = cpu.toFixed(1);
  const compact = cpu < 10 && cpu >= 0 ? raw.replace(/^0/, "") : raw;
  if (compact.startsWith(".")) {
    return `  ${compact}`.padEnd(WRKACTJOB_WIDTHS.cpu, " ");
  }
  return compact.padStart(WRKACTJOB_WIDTHS.cpu, " ");
}

/** Column header line aligned to WRKACTJOB data columns (cols 6–80). */
export function wrkActJobColumnHeaderLine(): string {
  const line = Array.from({ length: 80 }, () => " ");
  const write = (col: number, text: string) => {
    for (let i = 0; i < text.length && col + i <= 80; i++) {
      line[col - 1 + i] = text[i]!;
    }
  };
  const c = WRKACTJOB_COLUMNS;
  write(c.opt, "Opt");
  write(c.name + 1, "Subsystem/Job");
  write(25, "Current User");
  write(c.type, "Type");
  write(c.cpu, "CPU %");
  write(c.function, "Function");
  write(c.status, "Status");
  return line.join("").slice(c.opt - 1);
}
