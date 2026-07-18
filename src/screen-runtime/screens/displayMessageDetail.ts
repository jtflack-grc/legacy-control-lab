import type { ScreenDefinition } from "../screen.js";
import { getInquiryReplyOptions, type MessageQueueEntry } from "../../ibmi-runtime/messageService.js";
import {
  commandField,
  ibmScreenHeader,
  outputField,
  standardFunctionKeys,
} from "./screenHelpers.js";

export function createDisplayMessageDetailScreen(
  systemName: string,
  queueName: string,
  message: MessageQueueEntry,
  statusMessage?: string,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPMSG", "Display Message", systemName),
    outputField("QUEUE", 2, 6, `Queue . . . . . . . . . . . . : ${queueName}`),
    outputField("MSGID", 3, 6, `Message ID . . . . . . . . . . : ${message.messageId}`),
    outputField("SEV", 4, 6, `Severity . . . . . . . . . . . : ${message.severity}`),
    outputField("DATE", 5, 6, `Date . . . . . . . . . . . . . : ${message.date}`),
    outputField("TIME", 6, 6, `Time . . . . . . . . . . . . . : ${message.time}`),
  ];

  if (message.fromUser) {
    fields.push(outputField("FROM", 7, 6, `From . . . . . . . . . . . . . : ${message.fromUser}`));
  }

  const textLines = wrapMessageText(message.text, 68);
  textLines.slice(0, 4).forEach((line, index) => {
    fields.push(outputField(`TEXT${index}`, 9 + index, 6, line.padEnd(74).slice(0, 74)));
  });

  if (message.reply) {
    fields.push(outputField("REPLY_LABEL", 14, 6, `Reply . . . . . . . . . . . . . : ${message.reply}`));
  } else if (message.requiresReply) {
    const replyOptions = getInquiryReplyOptions(message.messageId);
    fields.push(
      outputField("REPLY_OPTS", 14, 6, `Valid replies . . . . . . . . . : ${replyOptions.display}`),
    );
    fields.push(outputField("REPLY_PROMPT", 15, 6, "Type reply, press Enter."));
    fields.push(outputField("REPLY_PREFIX", 16, 6, "Reply"));
    fields.push(commandField("MSG_REPLY", 16, 12, 1));
  }

  if (statusMessage) {
    fields.push(outputField("STATUS", 23, 1, statusMessage.padEnd(78).slice(0, 78)));
  }

  fields.push(standardFunctionKeys(23, "F1=Help   F3=Exit   F12=Cancel"));

  return {
    id: "DSPMSGDTL",
    title: "Display Message",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F1", label: "Help", action: "HELP" },
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

function wrapMessageText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}
