import { bot } from "./constants.ts";

export function stringToSet(obj: string): Set<number> {
  const str = String(obj);
  const set = new Set<number>();

  if (str) {
    const entries = str.split(",");
    for (const entry of entries) {
      const numEntry = parseInt(entry, 10);
      set.add(numEntry);
    }
  }

  return set;
}

export function setToString(set: Set<number>): string {
  return Array.from(set.values()).join(",");
}

export function stringToMap(obj: string): Map<number, Set<number>> {
  const str = String(obj);
  const map = new Map<number, Set<number>>();

  if (str) {
    const entries = str.split(",");

    for (const entry of entries) {
      const [key, valuesStr] = entry.split(":");
      const numKey = parseInt(key, 10);
      const values = valuesStr ? valuesStr.split("|").map(Number) : [];
      const numSet = new Set(values);
      map.set(numKey, numSet);
    }
  }

  return map;
}

export function mapToString(map: Map<number, Set<number>>): string {
  const entries: string[] = [];

  for (const [key, values] of map.entries()) {
    const valueStr = Array.from(values).join("|");
    entries.push(`${key}:${valueStr}`);
  }

  return entries.join(",");
}

export async function sendMessageWithThread(
  chatId: number,
  text: string,
  message_thread_id?: number,
  is_topic_message = false,
) {
  await bot.api.sendMessage(chatId, text, {
    message_thread_id: is_topic_message ? message_thread_id : undefined,
  });
}
