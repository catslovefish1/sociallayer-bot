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
  isSubscribe: boolean,
  message_thread_id?: number,
  is_topic_message = false,
) {
  if (groupId) {
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
