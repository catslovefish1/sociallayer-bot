import { InlineKeyboard } from "https://deno.land/x/grammy@v1.23.0/mod.ts";
import { bot, socialLayerClient } from "./constants.ts";
import { formatEvent } from "./format.ts";
import { markdownv2 as format } from "https://deno.land/x/telegram_format@v3.1.0/mod.ts";

export async function sendEvents(
  groupIds: number[],
  offset: number,
  lastLoadMoreMessageId: number | undefined,
  chatId: number,
  is_topic_message: boolean,
  message_thread_id: number | undefined,
): Promise<
  {
    offset: number;
    lastLoadMoreMessageId: number | undefined;
  } | void
> {
  const limit = 20;
  let newOffset = offset;
  const { events, hasNextPage } = await socialLayerClient.getTodaysEvents(
    groupIds,
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

  const appPromotionMessage = "Check out app.sola.day... to see more!";

  if (hasEvents) {
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
    const formattedEvents = events.map(formatEvent).map((msg) => msg.caption)
      .join("\n\n");

    const messageToSend = `${
      introMessage.length != 0
        ? format.bold(format.escape(`${introMessage}\n\n`))
        : ""
    }${formattedEvents}${
      !hasNextPage
        ? format.italic(
          format.escape(`\n\nThat's all for now!${appPromotionMessage}`),
        )
        : ""
    }`;

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
