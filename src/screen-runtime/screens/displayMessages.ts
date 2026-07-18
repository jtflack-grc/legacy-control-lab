import type { ScreenDefinition } from "../screen.js";
import type { MessageQueueEntry } from "../../ibmi-runtime/messageService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmHiOutput,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  SUBFILE_PAGE_FKEYS,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";

const MSG_FIRST_ROW = 9;
const MSG_VISIBLE = 7;
const MSG_COL = {
  opt: 6,
  severity: 10,
  date: 19,
  time: 30,
  id: 40,
  text: 52,
} as const;

function formatQueueName(queueName: string): string {
  const upper = queueName.trim().toUpperCase();
  if (upper.includes("/")) {
    const [library, name] = upper.split("/");
    return name ?? upper;
  }
  return upper;
}

function formatQueueLibrary(queueName: string): string {
  const upper = queueName.trim().toUpperCase();
  if (upper.includes("/")) {
    return upper.split("/")[0] ?? "QSYS";
  }
  return "QSYS";
}

export function createDisplayMessagesScreen(
  systemName: string,
  queueName: string,
  messages: MessageQueueEntry[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(messages, page, MSG_VISIBLE);
  const queue = formatQueueName(queueName);
  const library = formatQueueLibrary(queueName);

  const fields = [
    ibmScreenHeader("DSPMSG", "Display Messages", systemName),
    outputField("QUEUE", 2, 6, `Queue . . . . . . . . . . . . :   ${queue.padEnd(10)}`),
    outputField("QLIB", 2, 46, `Library . . . . . . . . . . :   ${library.padEnd(10)}`),
    outputField("SEV", 3, 6, "Severity  . . . . . . . . . . :   00"),
    outputField("DELIV", 3, 46, "Delivery  . . . . . . . . . . :   *NORMAL"),
    outputField("BLANK1", 4, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 5, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 6, 6, "  4=Remove   5=Display   6=Reply (inquiry)"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.opt, "Opt", "COL_OPT"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.severity, "Severity", "COL_SEV"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.date, "Date", "COL_DATE"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.time, "Time", "COL_TIME"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.id, "ID", "COL_ID"),
    ibmColumnHeader(MSG_FIRST_ROW - 2, MSG_COL.text, "Message", "COL_TEXT"),
  ];

  visible.forEach((message, index) => {
    const row = MSG_FIRST_ROW + index;
    fields.push(commandField(`MOPT${index}`, row, MSG_COL.opt, 1));
    fields.push(outputField(`MSEV${index}`, row, MSG_COL.severity, message.severity.padEnd(8).slice(0, 8)));
    fields.push(outputField(`MDTE${index}`, row, MSG_COL.date, message.date));
    fields.push(outputField(`MTME${index}`, row, MSG_COL.time, message.time));
    fields.push(outputField(`MID${index}`, row, MSG_COL.id, message.messageId.padEnd(10).slice(0, 10)));
    const suffix = message.requiresReply ? " (I)" : message.reply ? " (A)" : "";
    fields.push(
      outputField(
        `MTXT${index}`,
        row,
        MSG_COL.text,
        `${message.text}${suffix}`.padEnd(28).slice(0, 28),
      ),
    );
  });

  if (messages.length === 0) {
    fields.push(outputField("EMPTY", MSG_FIRST_ROW, MSG_COL.text, "No messages in queue."));
  }

  const pageStatus = subfilePageIndicator(page, messages.length, MSG_VISIBLE);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(
    ...subfileScreenFooter(
      "F1=Help   F3=Exit   F5=Refresh   F7=Page up   F8=Page down   F12=Cancel",
      "",
      false,
    ),
  );

  return {
    id: "DSPMSGINT",
    title: "Display Messages",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
