import { SolaContext } from "./constants.ts";
import {
  mapToString,
  sendMessageWithThread,
  setToString,
  stringToMap,
  stringToSet,
} from "./utilities.ts";

export async function handleSubscription(
  ctx: SolaContext,
  chatId: number,
  groupId: number | undefined,
  hourInput: string | undefined,
  daysInput: string | undefined,
  isSubscribe: boolean,
  message_thread_id?: number,
  is_topic_message = false,
) {
  if (groupId) {
    let hour: undefined | number = undefined;
    if (hourInput) {
      hour = parseInt(hourInput);

      // 定义允许的最小值和最大值
      const minHour = 0;
      const maxHour = 23;

      // 检查hour是否在范围内
      if (hour < minHour || hour > maxHour) {
        // hour不在范围内，报错或执行其他操作
        await sendMessageWithThread(
          chatId,
          "❌ Invalid hour. Please enter a valid hour between 0 and 23.",
          message_thread_id,
          is_topic_message,
        );

        return;
      }
    }
    let days: undefined | number = undefined;
    if (daysInput) {
      days = parseInt(daysInput);

      // 定义允许的最小值
      const minDays = 1;

      // 检查days是否在范围内
      if (days < minDays) {
        // days不在范围内，报错或执行其他操作
        await sendMessageWithThread(
          chatId,
          "❌ Invalid days. Please enter a valid days bigger than 1.",
          message_thread_id,
          is_topic_message,
        );

        return;
      }
    }
    if (hour) {
      // hour在范围内，继续处理
      ctx.session.temporary.hour = hour;
    }

    if (days) {
      ctx.session.temporary.days = days;
    }

    ctx.session.temporary.groupId = groupId;
    ctx.session.temporary.offset = 0;

    const keys = stringToMap(ctx.session.global.keys);
    const keysSet = keys.get(chatId);

    if (isSubscribe) {
      if (!keysSet) {
        keys.set(chatId, new Set([message_thread_id ? message_thread_id : 0]));
      } else {
        keysSet.add(message_thread_id ? message_thread_id : 0);
      }
      ctx.session.global.keys = mapToString(keys);
      // const subscriptionSet = stringToSet(
      //   ctx.session.temporary.subscription,
      // );
      // subscriptionSet.add(groupId);
      const subscriptionSet = new Set([groupId]);
      ctx.session.temporary.subscription = setToString(subscriptionSet);
    } else {
      if (
        keysSet && keysSet.delete(message_thread_id ? message_thread_id : 0)
      ) {
        keys.set(chatId, keysSet);
        ctx.session.global.keys = mapToString(keys);
      }

      const subscriptionSet = stringToSet(
        ctx.session.temporary.subscription,
      );
      subscriptionSet.delete(groupId);
      ctx.session.temporary.subscription = setToString(subscriptionSet);
    }

    const action = isSubscribe ? "Subscribed" : "Unsubscribed";
    await sendMessageWithThread(
      chatId,
      `✅ ${action} to daily event updates!`,
      message_thread_id,
      is_topic_message,
    );
  } else {
    await sendMessageWithThread(
      chatId,
      "❌ Invalid group ID. Please try again with /subs <groupId> or /unsubs <groupId>.",
      message_thread_id,
      is_topic_message,
    );
  }
}
