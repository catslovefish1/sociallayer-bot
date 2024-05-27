import {
  Bot,
  Context,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.4.2/free/src/mod.ts";
import { SocialLayerClient } from "./client.ts";

export interface SessionData {
  temporary: {
    groupId: number | undefined;
    offset: number;
    lastLoadMoreMessageId: number | undefined;
    subscription: string;
    isSubs: boolean;
  };
  global: { keys: string };
}

export const GLOBAL_KEY: string = "global";

export function globalStorage(): {
  read(key: string): Promise<{
    keys: string;
  }>;
  write(key: string, data: {
    keys: string;
  }): Promise<void>;
  delete(key: string): Promise<void>;
  getToken(): Promise<string>;
} {
  return freeStorage<{ keys: string }>(bot.token);
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
  read(key: string): Promise<{
    groupId: number | undefined;
    offset: number;
    lastLoadMoreMessageId: number | undefined;
    subscription: string;
    isSubs: boolean;
  }>;
  write(key: string, data: {
    groupId: number | undefined;
    offset: number;
    lastLoadMoreMessageId: number | undefined;
    subscription: string;
    isSubs: boolean;
  }): Promise<void>;
  delete(key: string): Promise<void>;
  getToken(): Promise<string>;
} {
  return freeStorage<{
    groupId: number | undefined;
    offset: number;
    lastLoadMoreMessageId: number | undefined;
    subscription: string;
    isSubs: boolean;
  }>(bot.token);
}

export type SolaContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<SolaContext>(
  Deno.env.get('TELEGRAM_BOT_TOKEN')!,
);

export const socialLayerClient = new SocialLayerClient();
