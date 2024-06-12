import { InlineKeyboard } from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { bot, socialLayerClient } from "./constants.ts";
import { formatEvent } from "./format.ts";
import { markdownv2 as format } from "https://deno.land/x/telegram_format@v3.1.0/mod.ts";
import { parseDate } from "./client.ts";

export async function sendEventsRaw(
  groupIds: number[],
  offset: number,
  lastLoadMoreMessageId: number | undefined,
  chatId: number,
  is_topic_message: boolean,
  message_thread_id: number | undefined,
  startISO: string,
  endISO: string,
): Promise<
  {
    offset: number;
    lastLoadMoreMessageId: number | undefined;
  } | void
> {
  const limit = 10;
  let newOffset = offset;
  const { events, hasNextPage } = await socialLayerClient.getEventsRaw(
    groupIds,
    startISO,
    endISO,
    limit,
    offset,
  );
  const eventsCount = events.length;
  const hasEvents = eventsCount > 0;
  const spots = new Set(
    events.map((value) => {
      return value.location;
    }),
  );
  const introMessage = offset === 0
    ? `Hey there, early birds and night owls! Guess what? We've got a day crammed with awesomeness ${
      hasNextPage ? `more than ${eventsCount}` : eventsCount
    } fantastic events spread across ${spots.size} lively spots. Dive in and enjoy!`
    : "";

  const groupInfos = await socialLayerClient.getGroupInfos(groupIds);
  const info = groupInfos.at(0);

  const appPromotionMessage = "Check out app.sola.day... to see more!";

  if (hasEvents && info) {
    const groupUrl = `https://${info.username}.sola.day`;
    console.debug(
      `${lastLoadMoreMessageId || "undefined lastLoadMoreMessageId"}`,
    );
    if (lastLoadMoreMessageId) {
      console.debug("delete");
      try {
        await bot.api.deleteMessage(chatId, lastLoadMoreMessageId);
      } catch (error) {
        console.error("Failed to delete previous 'Load More' message:", error);
      }
    }

    newOffset += events.length;
    const formattedEvents = events.map((event) =>
      formatEvent(event, info.username)
    ).map((msg) => msg.caption)
      .join("\n\n");

    const messageToSend = `${
      introMessage.length != 0
        ? `${format.bold(format.escape(`${introMessage}\n`))}${
          format.underline(format.escape(`${groupUrl}\n\n`))
        }`
        : ""
    }${formattedEvents}${
      !hasNextPage
        ? format.italic(
          format.escape(`\n\nThat's all for now!${appPromotionMessage}`),
        )
        : ""
    }`;

    console.debug(`${messageToSend}`);

    await bot.api.sendMessage(chatId, messageToSend, {
      parse_mode: "MarkdownV2",
      message_thread_id: is_topic_message ? message_thread_id : undefined,
    });

    if (hasNextPage) {
      const inlineKeyboard = hasNextPage
        ? new InlineKeyboard().text("Load More", "load_more")
        : undefined;

      const loadMoreMessage = await bot.api.sendMessage(
        chatId,
        `More results available! ${appPromotionMessage}`,
        {
          reply_markup: inlineKeyboard,
          message_thread_id: is_topic_message ? message_thread_id : undefined,
        },
      );

      return {
        offset: newOffset,
        lastLoadMoreMessageId: loadMoreMessage.message_id,
      };
    }
  } else {
    await bot.api.sendMessage(
      chatId,
      `🙈 No events today. ${appPromotionMessage}`,
      {
        message_thread_id: is_topic_message ? message_thread_id : undefined,
      },
    );
  }
}

export async function sendEvents(
  groupIds: number[],
  offset: number,
  lastLoadMoreMessageId: number | undefined,
  chatId: number,
  is_topic_message: boolean,
  message_thread_id: number | undefined,
  startDateInput: string,
  days: number,
): Promise<
  {
    offset: number;
    lastLoadMoreMessageId: number | undefined;
  } | void
> {
  const groupInfo = await socialLayerClient.getGroupTimestamp(groupIds);
  const timezone = groupInfo.length === 0 ? "Asia/Shanghai" : groupInfo[0];

  // Parse date inputs
  const startDate = parseDate(startDateInput, timezone);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + days);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const res = await sendEventsRaw(
    groupIds,
    offset,
    lastLoadMoreMessageId,
    chatId,
    is_topic_message,
    message_thread_id,
    startISO,
    endISO,
  );

  return res;
}

export async function sendTodayEvents(
  groupIds: number[],
  offset: number,
  lastLoadMoreMessageId: number | undefined,
  chatId: number,
  is_topic_message: boolean,
  message_thread_id: number | undefined,
  days: number,
): Promise<
  {
    offset: number;
    lastLoadMoreMessageId: number | undefined;
  } | void
> {
  const res = await sendEvents(
    groupIds,
    offset,
    lastLoadMoreMessageId,
    chatId,
    is_topic_message,
    message_thread_id,
    "today",
    days,
  );
  return res;
}
