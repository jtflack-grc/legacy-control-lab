import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type MessageSeverity = "info" | "inquiry" | "warning" | "error" | "completion";

export type LabMessage = {
  messageId: string;
  severity: MessageSeverity;
  shortText: string;
  secondLevelText?: string;
  category: string;
  relatedCommands?: string[];
};

let cache: Map<string, LabMessage> | null = null;

function loadMessages(): Map<string, LabMessage> {
  if (cache) return cache;
  const path = join(process.cwd(), "data", "messages", "messages.json");
  if (!existsSync(path)) {
    cache = new Map();
    return cache;
  }
  const rows = JSON.parse(readFileSync(path, "utf8")) as LabMessage[];
  cache = new Map(rows.map((row) => [row.messageId.toUpperCase(), row]));
  return cache;
}

export function getLabMessage(messageId: string): LabMessage | undefined {
  return loadMessages().get(messageId.toUpperCase());
}

export function formatLabMessage(messageId: string, tokens?: Record<string, string>): string {
  const message = getLabMessage(messageId);
  if (!message) return `${messageId} - Message not found in catalog.`;
  let text = `${message.messageId} - ${message.shortText}`;
  if (tokens) {
    for (const [key, value] of Object.entries(tokens)) {
      text = text.replaceAll(`&${key}`, value);
    }
  }
  return text;
}

export function listLabMessages(): LabMessage[] {
  return [...loadMessages().values()];
}

/** Reset cache for tests. */
export function resetMessageCatalogCache(): void {
  cache = null;
}
