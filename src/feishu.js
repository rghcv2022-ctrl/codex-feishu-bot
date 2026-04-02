import * as Lark from "@larksuiteoapi/node-sdk";

function chunkText(text, maxChars) {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let size = remaining.lastIndexOf("\n", maxChars);
    if (size < Math.floor(maxChars * 0.5)) {
      size = maxChars;
    }
    chunks.push(remaining.slice(0, size));
    remaining = remaining.slice(size).trimStart();
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks;
}

export function createFeishuClient(config) {
  return new Lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
    appType: Lark.AppType.SelfBuild,
    domain: config.domain === "lark" ? Lark.Domain.Lark : Lark.Domain.Feishu,
  });
}

export async function probeFeishuBot(client) {
  const response = await client.request({
    method: "GET",
    url: "/open-apis/bot/v3/info",
    data: {},
    timeout: 10000,
  });
  if (response.code !== 0) {
    throw new Error(`Feishu probe failed: ${response.msg || response.code}`);
  }
  return {
    botName: response.bot?.bot_name || response.data?.bot?.bot_name || null,
    botOpenId: response.bot?.open_id || response.data?.bot?.open_id || null,
  };
}

export function createFeishuWsClient(config) {
  return new Lark.WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
    domain: config.domain === "lark" ? Lark.Domain.Lark : Lark.Domain.Feishu,
    loggerLevel: Lark.LoggerLevel.info,
  });
}

export async function sendTextMessage(client, openId, text, maxChars) {
  const parts = chunkText(text, maxChars);
  for (const part of parts) {
    const response = await client.im.message.create({
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: openId,
        msg_type: "text",
        content: JSON.stringify({ text: part }),
      },
    });

    if (response.code !== 0) {
      throw new Error(`Feishu send failed: ${response.msg || response.code}`);
    }
  }
}

export function extractTextFromEvent(event) {
  if (!event?.message?.message_id || !event?.sender?.sender_id?.open_id) {
    return null;
  }

  const messageType = event.message.message_type;
  if (messageType !== "text") {
    return {
      messageId: event.message.message_id,
      openId: event.sender.sender_id.open_id,
      senderName: event.sender.sender_id.name || null,
      unsupported: true,
      text: null,
    };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(event.message.content || "{}");
  } catch {
    parsed = {};
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  return {
    messageId: event.message.message_id,
    openId: event.sender.sender_id.open_id,
    senderName: event.sender.sender_id.name || null,
    unsupported: false,
    text,
  };
}

