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
import { sendEventsRaw, sendTodayEvents } from "./events.ts";
import {
  sendMessageWithThread,
  stringToMap,
  stringToSet,
} from "./utilities.ts";
import { handleSubscription } from "./subscription.ts";
import { SolaGroup } from "./types.ts";
import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";
import { parseDate } from "./client.ts";

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
      lastEndISO: undefined,
      lastStartISO: undefined,
      hour: 7,
      days: 1,
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
  { command: "start", description: "Start using the bot to receive greetings and instructions." },
  { command: "list", description: "List all ongoing group activities that are currently available for subscription." },
  {
    command: "subs",
    description: "<group name> Subscribe to activity updates for the specified group. Use `hour=<number>` and/or `days=<number>` to customize notification settings.",
  },
  {
    command: "query",
    description: "<group name> Query activity details for the specified group. Use `start=<date>`, `end=<date>`, and/or `days=<number>` to filter results.",
  },
  {
    command: "status",
    description: "Check the current subscription status for the channel, including the groups subscribed to and their notification settings.",
  },
]);

bot.use(autoThread());

bot.command("start", async (ctx) => {
  await ctx.reply(
    `👋 Welcome to the Sola Events Bot!

To get started, you can use the following commands:

- /subs <group_name>: Subscribe to daily event updates for a specific group. You can also customize notification settings with "hour=<number>" and/or "days=<number>". For example, "/subs my_group hour=8 days=3".

- /query <group_name>: Query activity details for the specified group. Use "start=<date>", "end=<date>", and/or "days=<number>" to filter results. For example, "/query my_group start=2023-10-01 end=2023-10-31".

- /status: Check the current subscription status for the channel, including the groups subscribed to and their notification settings.

- /list: List all ongoing group activities that are currently available for subscription.

For more information on how to use this bot and see examples of commands in context, please check out the source code at https://github.com/sociallayer-im/sociallayer-bot.`,
    { parse_mode: "Markdown" }
  );
});

import { markdownv2 as format } from "https://deno.land/x/telegram_format@v3.1.0/mod.ts";

bot.command("status", async (ctx) => {
  const subscriptionSet: Set<number> = stringToSet(
    ctx.session.temporary.subscription,
  );
  const hour = ctx.session.temporary.hour;
  const days = ctx.session.temporary.days;
  const subscriptionArray = [...subscriptionSet]
    .filter((groupId) => !isNaN(groupId));

  const groupInfos = await socialLayerClient.getGroupInfos(subscriptionArray);

  const formattedGroupInfos = groupInfos
    .map(({ username, timezone }) =>
      format.escape(
        `- Group: ${username}\n- Notification Time: ${hour} hour(s) (GMT ${timezone})\n- Displayed Days: ${days} day(s) (starting from today)`,
      )
    )
    .join("\n");

  const groupCount = groupInfos.length;
  let message;

  if (groupCount === 0) {
    message = "No groups subscribed";
  } else if (groupCount === 1) {
    message = `Subscribed group:\n${formattedGroupInfos}`;
  } else {
    message = `Subscribed groups:\n${formattedGroupInfos}`;
  }

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
});

bot.command("global", async (ctx) => {
  await ctx.reply(`${ctx.session.global.keys || "none"}`);
});

bot.command("clean", async (ctx) => {
  ctx.session.global.keys = "";
  await ctx.reply("clean!");
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
  const {
    groupId,
    offset,
    lastLoadMoreMessageId,
    lastStartISO,
    lastEndISO,
    isSubs,
    subscription,
  } = ctx.session.temporary;
  console.debug(`load_more: ${lastLoadMoreMessageId || "none"}`);

  if (chatId) {
    const res = await sendEventsRaw(
      (!isSubs && groupId) ? [groupId] : Array.from(stringToSet(subscription)),
      offset,
      lastLoadMoreMessageId,
      chatId,
      is_topic_message,
      message_thread_id,
      lastStartISO ? lastStartISO : "today",
      lastEndISO ? lastEndISO : "tomorrow",
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
      const { offset, subscription, hour, days } = await storage
        .read(key);

      const localTime = await getLocalTime(
        Array.from(stringToSet(subscription)),
        hour,
      );
      if (localTime) {
        const res = await sendTodayEvents(
          Array.from(stringToSet(subscription)),
          offset,
          undefined,
          chatId,
          is_topic_message,
          message_thread_id,
          days,
        );
        if (res) {
          const { offset, lastLoadMoreMessageId } = res;
          await storage.write(key, {
            groupId: undefined,
            offset,
            lastLoadMoreMessageId,
            lastStartISO: "today",
            lastEndISO: "tomorrow",
            hour,
            days,
            isSubs: true,
            subscription,
          });
        }
      }
    }
  }
});

async function getLocalTime(
  subscription: number[],
  hour: number,
): Promise<boolean> {
  try {
    const groupInfo = await socialLayerClient.getGroupTimestamp(subscription);
    const timezone = groupInfo.length === 0 ? "Asia/Shanghai" : groupInfo[0];
    const date = datetime().toZonedTime(timezone);
    return date.hour === hour;
  } catch (error) {
    console.error(`Failed to get group timezone for ${subscription}: ${error}`);
    return false;
  }
}

Deno.cron("breath", "*/1 * * * *", () => {
  console.log("Breath at every 1th minute.");
});

bot.command("subs", async (ctx) => {
  const args = ctx.match.split(" ");
  const groupIdInput = args.shift();
  const hourInput = args.find((arg) => arg.startsWith("hour="))?.split(
    "=",
  )[1];
  const daysInput = args.find((arg) => arg.startsWith("days="))?.split("=")[1];

  let groupId = groupIdInput
    ? await socialLayerClient.queryGroup(groupIdInput)
    : undefined;
  if (groupId == undefined) {
    groupId = parseGroupId(groupIdInput);
  }
  const chatId = ctx.chat?.id;
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;

  await handleSubscription(
    ctx,
    chatId,
    groupId,
    hourInput,
    daysInput,
    true,
    message_thread_id,
    is_topic_message,
  );
});

// Main command handler for /query
bot.command("query", async (ctx) => {
  const args = ctx.match.split(" ");
  const groupIdInput = args.shift();
  const startDateInput = args.find((arg) => arg.startsWith("start="))?.split(
    "=",
  )[1];
  const endDateInput = args.find((arg) => arg.startsWith("end="))?.split(
    "=",
  )[1];
  const daysInput = args.find((arg) => arg.startsWith("days="))?.split("=")[1];

  let groupId = groupIdInput
    ? await socialLayerClient.queryGroup(groupIdInput)
    : undefined;
  if (groupId == undefined) {
    groupId = parseGroupId(groupIdInput);
  }
  const chatId = ctx.chat?.id;
  const message_thread_id = ctx.msg?.message_thread_id;
  const is_topic_message = ctx.msg?.is_topic_message ?? false;

  if (groupId && chatId) {
    ctx.session.temporary.groupId = groupId;
    ctx.session.temporary.offset = 0;

    const groupInfo = await socialLayerClient.getGroupTimestamp([groupId]);
    const timezone = groupInfo.length === 0 ? "Asia/Shanghai" : groupInfo[0];

    let startDate: Date;
    let endDate: Date;

    try {
      try {
        if (!startDateInput) {
          startDate = parseDate("today", timezone);
        } else {
          startDate = parseDate(startDateInput, timezone);
        }

        if (endDateInput) {
          endDate = parseDate(endDateInput, timezone);
        } else if (daysInput) {
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + parseInt(daysInput));
        } else {
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 1);
        }
      } catch (error) {
        console.log(`query error: ${error}`);
        await sendMessageWithThread(
          chatId,
          `❌ Invalid date input. Please try again.`,
          message_thread_id,
          is_topic_message,
        );
        return;
      }
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      const res = await sendEventsRaw(
        [groupId],
        0,
        undefined,
        chatId,
        is_topic_message,
        message_thread_id,
        startISO,
        endISO,
      );

      if (res) {
        const { offset, lastLoadMoreMessageId } = res;
        ctx.session.temporary.offset = offset;
        ctx.session.temporary.lastLoadMoreMessageId = lastLoadMoreMessageId;
        ctx.session.temporary.lastStartISO = startISO;
        ctx.session.temporary.lastEndISO = endISO;
        ctx.session.temporary.isSubs = false;
        ctx.session.temporary.groupId = groupId;
      }
    } catch (error) {
      console.log(`query error: ${error}`);
      await sendMessageWithThread(
        chatId,
        `❌ Internal error ${error}. Please try again.`,
        message_thread_id,
        is_topic_message,
      );
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
