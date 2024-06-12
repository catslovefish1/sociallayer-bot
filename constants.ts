import {
  Bot,
  Context,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.4.2/free/src/mod.ts";
import { SocialLayerClient } from "./client.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

await load();

export interface TemporaryStorageData {
  groupId: number | undefined;
  offset: number;
  lastLoadMoreMessageId: number | undefined;
  lastStartISO: string | undefined;
  lastEndISO: string | undefined;
  subscription: string;
  isSubs: boolean;
  hour: number;
  days: number;
}

export interface GlobalStorageData {
  keys: string;
}

export interface SessionData {
  temporary: TemporaryStorageData;
  global: GlobalStorageData;
}

export const GLOBAL_KEY: string = "global";

export function globalStorage(): {
  read(key: string): Promise<GlobalStorageData>;
  write(key: string, data: GlobalStorageData): Promise<void>;
  delete(key: string): Promise<void>;
  getToken(): Promise<string>;
} {
  return freeStorage<GlobalStorageData>(bot.token);
}
export function TEMPORARY_KEY(
  chatId: number,
  is_topic_message: boolean,
  message_thread_id: number | undefined,
): string {
  return `${chatId}/${
    (is_topic_message && message_thread_id) ? message_thread_id : 0
  }`;
}

export function temporaryStorage(): {
  read(key: string): Promise<TemporaryStorageData>;
  write(key: string, data: TemporaryStorageData): Promise<void>;
  delete(key: string): Promise<void>;
  getToken(): Promise<string>;
} {
  return freeStorage<TemporaryStorageData>(bot.token);
}

export type SolaContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<SolaContext>(
  Deno.env.get("TELEGRAM_BOT_TOKEN")!,
);

export const socialLayerClient = new SocialLayerClient();
