import type { ScreenDefinition } from "../screen.js";
import type { MessageQueueEntry } from "../../ibmi-runtime/messageService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmHiOutput,
  ibmOptionLegend,
  ibmOptionPrompt,
  outputField,
  subfilePagedFunctionKeys,
} from "./screenHelpers.js";
import {
  buildWorkWithMessageRows,
  formatQueueName,
  informationalForWorkWith,
  inquiriesForWorkWith,
  workWithInfoPageCount,
  workWithMessageRowAt,
  WRKMSG_INFO_FIRST_ROW,
  WRKMSG_INFO_HDR_ROW,
  WRKMSG_INFO_SLOTS,
  WRKMSG_INQUIRY_FIRST_ROW,
  WRKMSG_INQUIRY_HDR_ROW,
  WRKMSG_OPT_COL,
  WRKMSG_TEXT_COL,
  WRKMSG_TEXT_WIDTH,
  type WorkWithMessageRow,
} from "./workWithMessagesLayout.js";

export {
  buildWorkWithMessageRows,
  workWithMessageRowAt,
  workWithInfoPageCount,
  WRKMSG_INQUIRY_FIRST_ROW,
  WRKMSG_INFO_FIRST_ROW,
  WRKMSG_INFO_SLOTS,
} from "./workWithMessagesLayout.js";

function centeredTitle(text: string): ReturnType<typeof ibmHiOutput> {
  const col = Math.max(1, Math.floor((80 - text.length) / 2) + 1);
  return ibmHiOutput("HEADER", 1, col, text);
}

function sectionHeader(row: number, id: string, text: string): ReturnType<typeof ibmHiOutput> {
  const col = Math.max(1, Math.floor((80 - text.length) / 2) + 1);
  return ibmHiOutput(id, row, col, text);
}

function renderSectionRows(
  fields: ScreenDefinition["fields"],
  rows: WorkWithMessageRow[],
  section: "inquiry" | "info",
  firstRow: number,
  slots: number,
): void {
  const sectionRows = rows.filter((row) => row.section === section);
  for (let index = 0; index < slots; index += 1) {
    const row = sectionRows[index];
    const screenRow = firstRow + index;
    if (!row) {
      fields.push(outputField(`BLANK_${section}_${index}`, screenRow, WRKMSG_TEXT_COL, " ".repeat(WRKMSG_TEXT_WIDTH)));
      continue;
    }
    fields.push(commandField(row.optFieldId, screenRow, WRKMSG_OPT_COL, 1));
    fields.push(
      outputField(`MTXT_${row.optFieldId}`, screenRow, WRKMSG_TEXT_COL, row.text.slice(0, WRKMSG_TEXT_WIDTH)),
    );
  }
}

export function createDisplayMessagesBasicScreen(
  systemName: string,
  queueName: string,
  messages: MessageQueueEntry[],
  infoPage = 0,
  statusMessage?: string,
): ScreenDefinition {
  const queue = formatQueueName(queueName);
  const rows = buildWorkWithMessageRows(messages, infoPage);
  const infoPages = workWithInfoPageCount(messages);
  const pageHint =
    infoPages > 1
      ? infoPage + 1 < infoPages
        ? "More..."
        : infoPage > 0
          ? "Bottom"
          : ""
      : "";

  const fields = [
    centeredTitle("Work with Messages"),
    outputField("QUEUE", 2, 6, `Messages in:   ${queue}`),
    ibmOptionPrompt("OPTS", 3, 6, "Type options below, then press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  4=Remove   5=Display details and reply"),
    ibmColumnHeader(5, WRKMSG_OPT_COL, "Opt", "COL_OPT"),
    ibmColumnHeader(5, WRKMSG_TEXT_COL, "Message", "COL_MSG"),
    sectionHeader(WRKMSG_INQUIRY_HDR_ROW, "INQ_HDR", "Messages needing a reply"),
    sectionHeader(WRKMSG_INFO_HDR_ROW, "INFO_HDR", "Messages not needing a reply"),
  ];

  renderSectionRows(fields, rows, "inquiry", WRKMSG_INQUIRY_FIRST_ROW, 4);
  renderSectionRows(fields, rows, "info", WRKMSG_INFO_FIRST_ROW, WRKMSG_INFO_SLOTS);

  if (pageHint) {
    fields.push(ibmHiOutput("PAGE", 22, 71, pageHint.padStart(9)));
  }

  if (statusMessage) {
    fields.push(outputField("STATUS", 23, 1, statusMessage.padEnd(78).slice(0, 78)));
  }

  fields.push(
    outputField("FKEYS", 24, 1, "F3=Exit   F7=Page up   F8=Page down   F22=Advanced view", {
      color: "blue",
    }),
  );

  return {
    id: "DSPMSG",
    title: "Work with Messages",
    rows: 24,
    cols: 80,
    commandLine: false,
    fields,
    functionKeys: [
      ...subfilePagedFunctionKeys().filter((key) => key.key !== "F5" && key.key !== "F11"),
      { key: "F22", label: "Advanced view", action: "ADVANCED_VIEW" },
    ],
  };
}

export function orderMessagesForBasicView(messages: MessageQueueEntry[]): MessageQueueEntry[] {
  return [...inquiriesForWorkWith(messages), ...informationalForWorkWith(messages)];
}

export function expandBasicDisplayRows(messages: MessageQueueEntry[]): Array<{ messageId: string; text: string }> {
  return buildWorkWithMessageRows(messages, 0)
    .filter((row) => row.message)
    .map((row) => ({ messageId: row.message!.id, text: row.text }));
}

export function basicDisplayRowAt(
  messages: MessageQueueEntry[],
  infoPage: number,
  row: number,
): { messageId: string; text: string } | undefined {
  const entry = workWithMessageRowAt(messages, infoPage, row);
  if (!entry?.message) return undefined;
  return { messageId: entry.message.id, text: entry.text };
}
