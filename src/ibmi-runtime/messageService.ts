import type { IbmiSession } from "./sessionService.js";
import { applyMutation } from "../runtime/runtimeMutationService.js";
import { DEFAULT_QSYSOPR_MESSAGES } from "./qsysoprMessageSeed.js";
import type { MessageQueueEntry, MessageQueueOverride } from "./messageTypes.js";

export type { MessageQueueEntry, MessageQueueOverride } from "./messageTypes.js";

/** Valid single-character replies for inquiry messages (per QCPFMSG / operator conventions). */
export type InquiryReplyDefinition = {
  /** Reply letters shown in parentheses on Work with Messages. */
  display: string;
  valid: readonly string[];
};

const INQUIRY_REPLY_BY_MSGID: Record<string, InquiryReplyDefinition> = {
  // Job ended abnormally — Cancel, Ignore, Go, Retry (common operator inquiry set).
  CPI1221: { display: "C I G R", valid: ["C", "I", "G", "R"] },
  // Job held — Cancel, End job, Release job (CPI112D/CPI112E-style operator action).
  CPI1337: { display: "C E R", valid: ["C", "E", "R"] },
};

const DEFAULT_INQUIRY_REPLY: InquiryReplyDefinition = {
  display: "C I G R",
  valid: ["C", "I", "G", "R"],
};

const DEFAULT_MESSAGES: MessageQueueEntry[] = DEFAULT_QSYSOPR_MESSAGES;

function queueKey(systemName: string, queueName: string): string {
  return `${systemName}:${queueName.trim().toUpperCase() || "QSYSOPR"}`;
}

function sessionQueue(session: IbmiSession | undefined, queueName: string): MessageQueueEntry[] {
  if (!session) return [];
  session.messageQueues ??= {};
  const key = queueKey(session.systemName, queueName);
  session.messageQueues[key] ??= [];
  return session.messageQueues[key]!;
}

function sessionOverrides(session: IbmiSession, queueName: string): Record<string, MessageQueueOverride> {
  session.messageOverrides ??= {};
  const key = queueKey(session.systemName, queueName);
  session.messageOverrides[key] ??= {};
  return session.messageOverrides[key]!;
}

function cloneEntry(entry: MessageQueueEntry): MessageQueueEntry {
  return { ...entry };
}

function withOverride(entry: MessageQueueEntry, override?: MessageQueueOverride): MessageQueueEntry {
  if (!override) return cloneEntry(entry);
  return cloneEntry({ ...entry, ...override });
}

function listQueueEntries(queueName: string, session?: IbmiSession): MessageQueueEntry[] {
  const queue = queueName.trim().toUpperCase() || "QSYSOPR";
  const injected = session ? sessionQueue(session, queue) : [];
  const base = queue === "QSYSOPR" ? DEFAULT_MESSAGES : [];
  return [...base, ...injected];
}

export function getInquiryReplyOptions(messageId: string): InquiryReplyDefinition {
  const id = messageId.trim().toUpperCase();
  return INQUIRY_REPLY_BY_MSGID[id] ?? DEFAULT_INQUIRY_REPLY;
}

export function formatInquiryReplySuffix(messageId: string): string {
  const options = getInquiryReplyOptions(messageId);
  return `  (${options.display})`;
}

export function isValidInquiryReply(messageId: string, reply: string): boolean {
  const normalized = reply.trim().toUpperCase();
  if (!normalized) return false;
  return getInquiryReplyOptions(messageId).valid.includes(normalized);
}

export function getMessages(queueName = "QSYSOPR", session?: IbmiSession): MessageQueueEntry[] {
  const queue = queueName.trim().toUpperCase() || "QSYSOPR";
  const overrides = session ? sessionOverrides(session, queue) : {};
  return listQueueEntries(queue, session)
    .map((entry) => withOverride(entry, overrides[entry.id]))
    .filter((entry) => !entry.removed);
}

export function getMessageById(
  queueName: string,
  messageId: string,
  session?: IbmiSession,
): MessageQueueEntry | undefined {
  return getMessages(queueName, session).find((entry) => entry.id === messageId);
}

export function sendMessage(
  session: IbmiSession,
  queueName: string,
  text: string,
  messageId = "CPF9898",
): MessageQueueEntry {
  const queue = sessionQueue(session, queueName);
  const now = new Date();
  const entry: MessageQueueEntry = {
    id: String(Date.now()),
    severity: "00",
    date: now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }),
    time: now.toLocaleTimeString("en-US", { hour12: false }),
    messageId,
    text: text.trim(),
  };
  queue.push(entry);
  return entry;
}

export function removeMessage(
  session: IbmiSession,
  queueName: string,
  messageId: string,
): { ok: true } | { ok: false; message: string } {
  const entry = getMessageById(queueName, messageId, session);
  if (!entry) {
    return { ok: false, message: "CPF2405 - Message not found." };
  }
  const overrides = sessionOverrides(session, queueName);
  overrides[messageId] = { ...overrides[messageId], removed: true };
  if (session.missionAttemptId) {
    applyMutation(
      session,
      {
        mutationType: "message_removed",
        entityType: "message_queue",
        entityId: `${queueName}/${messageId}`,
        commandText: `RMVMSG MSGQ(${queueName})`,
        before: { messageId: entry.messageId, removed: false },
        after: { messageId: entry.messageId, removed: true },
        evidenceTags: ["message_queue_review"],
        auditEntryType: "CP",
        auditMessage: `Message ${entry.messageId} removed from ${queueName}`,
      },
      () => ({ ok: true }),
    );
  }
  return { ok: true };
}

export function replyToMessage(
  session: IbmiSession,
  queueName: string,
  messageId: string,
  replyText: string,
): { ok: true; message: string } | { ok: false; message: string } {
  const entry = getMessageById(queueName, messageId, session);
  if (!entry) {
    return { ok: false, message: "CPF2405 - Message not found." };
  }
  if (!entry.requiresReply) {
    return { ok: false, message: "CPF2406 - Message does not require a reply." };
  }
  const reply = replyText.trim().toUpperCase();
  if (!reply) {
    return { ok: false, message: "CPF0006 - Reply required." };
  }
  if (!isValidInquiryReply(entry.messageId, reply)) {
    const allowed = getInquiryReplyOptions(entry.messageId).valid.join(", ");
    return { ok: false, message: `CPF9898 - Valid reply values are ${allowed}.` };
  }
  const before = entry.reply ?? "";
  const overrides = sessionOverrides(session, queueName);
  overrides[messageId] = { ...overrides[messageId], reply, requiresReply: false };
  if (session.missionAttemptId) {
    applyMutation(
      session,
      {
        mutationType: "message_reply",
        entityType: "message_queue",
        entityId: `${queueName}/${messageId}`,
        commandText: `DSPMSG MSGQ(${queueName})`,
        before: { reply: before },
        after: { reply },
        evidenceTags: ["operator_response", "message_queue_review"],
        auditEntryType: "CP",
        auditMessage: `Inquiry message ${entry.messageId} answered on ${queueName}`,
        coachEventKey: "message_replied",
      },
      () => ({ ok: true }),
    );
  }
  return { ok: true, message: `CPI9898 - Reply recorded for message ${entry.messageId}.` };
}

export function getMessageDescription(messageId: string): { messageId: string; text: string } {
  const id = messageId.trim().toUpperCase();
  const known = DEFAULT_MESSAGES.find((entry) => entry.messageId === id);
  return {
    messageId: id,
    text: known?.text ?? `Synthetic description for message ${id} in Legacy Control Lab.`,
  };
}
