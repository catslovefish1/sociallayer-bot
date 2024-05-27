import { Context, session } from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { freeStorage } from "https://deno.land/x/grammy_storages@v2.4.2/free/src/mod.ts";
import { autoThread } from "https://raw.githubusercontent.com/grammyjs/auto-thread/main/src/mod.ts";
import {
  bot,
  GLOBAL_KEY,
  globalStorage,
  socialLayerClient,
  TEMPORARY_KEY,
  temporaryStorage,
} from "./constants.ts";
import { formatGroups, parseGroupId } from "./format.ts";
import { sendEvents } from "./events.ts";
import {
  sendMessageWithThread,
  stringToMap,
  stringToSet,
} from "./utilities.ts";
import { handleSubscription } from "./subscription.ts";
import { SolaGroup } from "./types.ts";
import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

// Stores data per user-chat combination.
function getSessionKey(ctx: Context): string | undefined {
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;

  // Give every user their one personal session storage per chat with the bot
  // (an independent session for each group and their private chat)
  return ctx.chat === undefined
    ? undefined
    : TEMPORARY_KEY(ctx.chat.id, is_topic_message, message_thread_id);
}

bot.use(session({
  type: "multi",
  temporary: {
    initial: () => ({
      groupId: undefined,
      offset: 0,
      eventIds: [],
      lastLoadMoreMessageId: undefined,
      subscription: "",
      isSubs: false,
    }),
    storage: freeStorage(bot.token),
    getSessionKey,
  },
  global: {
    initial: () => ({ keys: "" }),
    storage: freeStorage(bot.token),
    getSessionKey: () => GLOBAL_KEY,
  },
}));



// 英文版本
bot.api.setMyCommands([
  { command: "start", description: "Start using the bot" },
  { command: "list", description: "List all ongoing group activities" },
  {
    command: "subs",
    description: "<group name> Subscribe to activity updates for the group",
  },
  {
    command: "query",
    description: "<group name> Query activity details for the group",
  },
  {
    command: "status",
    description: "Check the current subscription status for the channel",
  },
]);

bot.use(autoThread());

bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Welcome to the Sola Events Bot! Use /subs to subscribe to daily event updates.",
  );
});

bot.command("status", async (ctx) => {
  const subscriptionSet: Set<number> = stringToSet(
    ctx.session.temporary.subscription,
  );
  const subscriptionArray = [...subscriptionSet]
    .filter((groupId) => !isNaN(groupId));

  const groupNames = await socialLayerClient.getGroupNames(subscriptionArray);

  const formattedGroupNames = groupNames
    .map((groupName) => `- ${groupName}`)
    .join("\n");

  const message = formattedGroupNames
    ? `Subscribed groups:\n${formattedGroupNames}`
    : "No groups subscribed";

  await ctx.reply(message);
});

bot.command("list", async (ctx) => {
  const groups: SolaGroup[] = await socialLayerClient.listGroups();

  const listGroupId = formatGroups(groups);

  ctx.reply(listGroupId, { parse_mode: "HTML" });
});

bot.callbackQuery("load_more", async (ctx) => {
  const chatId = ctx.chat?.id;
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;
  const { groupId, offset, lastLoadMoreMessageId, isSubs, subscription } =
    ctx.session.temporary;
  console.debug(`load_more: ${lastLoadMoreMessageId || "none"}`);

  if (chatId) {
    const res = await sendEvents(
      (!isSubs && groupId) ? [groupId] : Array.from(stringToSet(subscription)),
      offset,
      lastLoadMoreMessageId,
      chatId,
      is_topic_message,
      message_thread_id,
    );
    if (res) {
      const { offset, lastLoadMoreMessageId } = res;
      ctx.session.temporary.offset = offset;
      ctx.session.temporary.lastLoadMoreMessageId = lastLoadMoreMessageId;
    }
  }
});

Deno.cron("notify", "0 * * * *", async () => {
  console.log("每小时一次!");
  const storage = globalStorage();
  const global = await storage.read(GLOBAL_KEY);
  const globalMap = stringToMap(global.keys);

  for (const [chatId, ids] of globalMap) {
    for (const message_thread_id of ids) {
      console.log(`${chatId} ${message_thread_id}`);
      const storage = temporaryStorage();
      const is_topic_message = message_thread_id !== 0;
      const key = TEMPORARY_KEY(chatId, is_topic_message, message_thread_id);
      const { offset, lastLoadMoreMessageId, subscription } = await storage
        .read(key);

      const localTime = await getLocalTime(chatId);
      if (localTime) {
        const res = await sendEvents(
          Array.from(stringToSet(subscription)),
          offset,
          lastLoadMoreMessageId,
          chatId,
          is_topic_message,
          message_thread_id,
        );
        if (res) {
          const { offset, lastLoadMoreMessageId } = res;
          await storage.write(key, {
            groupId: undefined,
            offset,
            lastLoadMoreMessageId,
            isSubs: true,
            subscription,
          });
        }
      }
    }
  }
});

async function getLocalTime(chatId: number): Promise<boolean> {
  try {
    const groupInfo = await socialLayerClient.getGroupTimestamp([chatId]);
    const timezone = groupInfo.length === 0 ? "Asia/Shanghai" : groupInfo[0];
    const date = datetime().toZonedTime(timezone);
    return date.hour === 7;
  } catch (error) {
    console.error(`Failed to get group timezone for ${chatId}: ${error}`);
    return false;
  }
}

Deno.cron("breath", "*/1 * * * *", () => {
  console.log("Breath at every 1th minute.");
});

bot.command("subs", async (ctx) => {
  const groupId = await socialLayerClient.queryGroup(ctx.match);
  const chatId = ctx.chat?.id;
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;

  await handleSubscription(
    ctx,
    chatId,
    groupId,
    true,
    message_thread_id,
    is_topic_message,
  );
});


bot.command("query", async (ctx) => {
  let groupId = await socialLayerClient.queryGroup(ctx.match);
  if (groupId == undefined) {
    groupId = parseGroupId(ctx.match);
  }
  const chatId = ctx.chat?.id;
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;

  if (groupId && chatId) {
    ctx.session.temporary.groupId = groupId;
    ctx.session.temporary.offset = 0;
    const res = await sendEvents(
      [groupId],
      0,
      undefined,
      chatId,
      is_topic_message,
      message_thread_id,
    );
    if (res) {
      const { offset, lastLoadMoreMessageId } = res;
      ctx.session.temporary.offset = offset;
      ctx.session.temporary.lastLoadMoreMessageId = lastLoadMoreMessageId;
      ctx.session.temporary.isSubs = false;
      ctx.session.temporary.groupId = groupId;
    }
  } else {
    await sendMessageWithThread(
      chatId,
      "❌ Invalid group ID. Please try again with /query <groupId>.",
      message_thread_id,
      is_topic_message,
    );
  }
});

await bot.start();
