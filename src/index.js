import * as Lark from "@larksuiteoapi/node-sdk";
import process from "node:process";
import { loadConfig } from "./config.js";
import { runCodexTurn } from "./codex.js";
import {
  createFeishuClient,
  createFeishuWsClient,
  extractTextFromEvent,
  probeFeishuBot,
  sendTextMessage,
} from "./feishu.js";
import { StateStore } from "./state.js";

function createQueue() {
  const chains = new Map();
  return async function enqueue(key, task) {
    const previous = chains.get(key) || Promise.resolve();
    const next = previous.then(task, task);
    chains.set(key, next);
    try {
      return await next;
    } finally {
      if (chains.get(key) === next) {
        chains.delete(key);
      }
    }
  };
}

function isResetCommand(text) {
  const normalized = text.trim().toLowerCase();
  return normalized === "/new" || normalized === "/reset";
}

async function main() {
  const config = loadConfig();
  const state = new StateStore(config.dataDir);
  const client = createFeishuClient(config);
  const wsClient = createFeishuWsClient(config);
  const dispatcher = new Lark.EventDispatcher({});
  const enqueue = createQueue();
  const probeOnly = process.argv.includes("--probe");

  const identity = await probeFeishuBot(client);
  console.log(
    `Feishu bot ready: ${identity.botName || "unknown"} (${identity.botOpenId || "unknown"})`,
  );

  if (probeOnly) {
    process.exit(0);
  }

  dispatcher.register({
    "im.message.receive_v1": async (data) => {
      if (data?.message?.chat_type !== "p2p") {
        return;
      }
      if (
        data?.sender?.sender_type === "app" ||
        data?.sender?.sender_id?.open_id === identity.botOpenId
      ) {
        return;
      }

      const message = extractTextFromEvent(data);
      if (!message) {
        return;
      }

      await enqueue(message.openId, async () => {
        if (state.hasMessage(message.messageId)) {
          return;
        }
        state.rememberMessage(message.messageId);

        if (message.unsupported) {
          await sendTextMessage(
            client,
            message.openId,
            "当前这套 Codex 机器人先只支持飞书私聊文本消息。",
            config.replyChunkChars,
          );
          return;
        }

        const text = (message.text || "").trim();
        if (!text) {
          await sendTextMessage(
            client,
            message.openId,
            "我收到的是空消息，重新发一条文本就行。",
            config.replyChunkChars,
          );
          return;
        }

        if (isResetCommand(text)) {
          state.clearThread(message.openId);
          await sendTextMessage(
            client,
            message.openId,
            "上下文已清空。你现在可以直接开始新对话。",
            config.replyChunkChars,
          );
          return;
        }

        const userState = state.getUser(message.openId);
        try {
          const result = await runCodexTurn({
            config,
            threadId: userState?.threadId || null,
            senderName: message.senderName,
            openId: message.openId,
            text,
          });

          state.upsertUser(message.openId, {
            threadId: result.threadId || null,
            senderName: message.senderName || userState?.senderName || null,
          });

          await sendTextMessage(client, message.openId, result.reply, config.replyChunkChars);
        } catch (error) {
          console.error("codex turn failed", error);
          await sendTextMessage(
            client,
            message.openId,
            "这次调用 Codex 失败了。你稍后重试一次，或者先发 /reset 重新开始。",
            config.replyChunkChars,
          );
        }
      });
    },
    "im.message.message_read_v1": async () => {},
  });

  wsClient.start({ eventDispatcher: dispatcher });
  console.log("Feishu websocket client started");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
