import {
  formatInquiryReplySuffix,
  type MessageQueueEntry,
} from "../../ibmi-runtime/messageService.js";

export const WRKMSG_INQUIRY_SLOTS = 4;
export const WRKMSG_INFO_SLOTS = 10;
export const WRKMSG_INQUIRY_HDR_ROW = 6;
export const WRKMSG_INQUIRY_FIRST_ROW = 7;
export const WRKMSG_INFO_HDR_ROW = 11;
export const WRKMSG_INFO_FIRST_ROW = 12;

export const WRKMSG_OPT_COL = 6;
export const WRKMSG_TEXT_COL = 10;
export const WRKMSG_TEXT_WIDTH = 68;

export type WorkWithMessageRow = {
  optFieldId: string;
  message?: MessageQueueEntry;
  text: string;
  section: "inquiry" | "info";
};

export function formatQueueName(queueName: string): string {
  const upper = queueName.trim().toUpperCase();
  if (upper.includes("/")) {
    return upper.split("/")[1] ?? upper;
  }
  return upper;
}

export function inquiriesForWorkWith(messages: MessageQueueEntry[]): MessageQueueEntry[] {
  return messages.filter((entry) => entry.requiresReply).slice().reverse();
}

export function informationalForWorkWith(messages: MessageQueueEntry[]): MessageQueueEntry[] {
  return messages.filter((entry) => !entry.requiresReply).slice().reverse();
}

export function formatWorkWithMessageText(message: MessageQueueEntry): string {
  let text = message.text;
  if (message.requiresReply) {
    text += formatInquiryReplySuffix(message.messageId);
  }
  if (message.fromUser) {
    return `${text}  (From ${message.fromUser})`;
  }
  return text;
}

export function buildWorkWithMessageRows(
  messages: MessageQueueEntry[],
  infoPage = 0,
): WorkWithMessageRow[] {
  const rows: WorkWithMessageRow[] = [];
  const inquiries = inquiriesForWorkWith(messages);
  const informational = informationalForWorkWith(messages);
  const infoStart = infoPage * WRKMSG_INFO_SLOTS;
  const infoVisible = informational.slice(infoStart, infoStart + WRKMSG_INFO_SLOTS);

  if (inquiries.length === 0) {
    rows.push({
      optFieldId: "MOPT0",
      text: "(No messages available)",
      section: "inquiry",
    });
  } else {
    inquiries.slice(0, WRKMSG_INQUIRY_SLOTS).forEach((message, index) => {
      rows.push({
        optFieldId: `MOPT${index}`,
        message,
        text: formatWorkWithMessageText(message),
        section: "inquiry",
      });
    });
  }

  const infoOffset = inquiries.length === 0 ? 1 : Math.min(inquiries.length, WRKMSG_INQUIRY_SLOTS);
  if (infoVisible.length === 0) {
    rows.push({
      optFieldId: `MOPT${infoOffset}`,
      text: "(No messages available)",
      section: "info",
    });
  } else {
    infoVisible.forEach((message, index) => {
      rows.push({
        optFieldId: `MOPT${infoOffset + index}`,
        message,
        text: formatWorkWithMessageText(message),
        section: "info",
      });
    });
  }

  return rows;
}

export function workWithMessageRowAt(
  messages: MessageQueueEntry[],
  infoPage: number,
  row: number,
): WorkWithMessageRow | undefined {
  if (row >= WRKMSG_INQUIRY_FIRST_ROW && row < WRKMSG_INFO_HDR_ROW) {
    const index = row - WRKMSG_INQUIRY_FIRST_ROW;
    const inquiryRows = buildWorkWithMessageRows(messages, infoPage).filter((entry) => entry.section === "inquiry");
    return inquiryRows[index];
  }
  if (row >= WRKMSG_INFO_FIRST_ROW && row < WRKMSG_INFO_FIRST_ROW + WRKMSG_INFO_SLOTS) {
    const index = row - WRKMSG_INFO_FIRST_ROW;
    const infoRows = buildWorkWithMessageRows(messages, infoPage).filter((entry) => entry.section === "info");
    return infoRows[index];
  }
  return undefined;
}

export function workWithInfoPageCount(messages: MessageQueueEntry[]): number {
  const total = informationalForWorkWith(messages).length;
  return total > 0 ? Math.ceil(total / WRKMSG_INFO_SLOTS) : 1;
}
