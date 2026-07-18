export type MessageQueueEntry = {
  id: string;
  severity: string;
  date: string;
  time: string;
  messageId: string;
  text: string;
  requiresReply?: boolean;
  reply?: string;
  fromUser?: string;
  removed?: boolean;
};

export type MessageQueueOverride = Partial<Pick<MessageQueueEntry, "removed" | "reply" | "requiresReply">>;
