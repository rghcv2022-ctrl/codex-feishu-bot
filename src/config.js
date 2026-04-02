import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_CONFIG_PATH = path.join(
  os.homedir(),
  ".config",
  "codex-feishu-bot",
  "config.json",
);

export function getConfigPath() {
  return process.env.CODEX_FEISHU_CONFIG || DEFAULT_CONFIG_PATH;
}

export function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const appId = String(raw.appId || "").trim();
  const appSecret = String(raw.appSecret || "").trim();
  if (!appId || !appSecret) {
    throw new Error(`Config file ${configPath} must contain appId and appSecret`);
  }

  const workspace = String(raw.workspace || os.homedir()).trim();
  const dataDir = String(
    raw.dataDir || path.join(os.homedir(), ".local", "share", "codex-feishu-bot"),
  ).trim();
  const replyChunkChars = Number(raw.replyChunkChars || 1800);

  fs.mkdirSync(dataDir, { recursive: true });

  return {
    configPath,
    appId,
    appSecret,
    workspace,
    dataDir,
    domain: raw.domain === "lark" ? "lark" : "feishu",
    replyChunkChars:
      Number.isFinite(replyChunkChars) && replyChunkChars > 200 ? replyChunkChars : 1800,
    systemPrompt: String(
      raw.systemPrompt ||
        "You are replying inside a Feishu direct message. Reply in Chinese by default, keep formatting plain text, and do not use markdown tables.",
    ).trim(),
    codex: {
      model: String(raw.codex?.model || "").trim(),
      extraArgs: Array.isArray(raw.codex?.extraArgs)
        ? raw.codex.extraArgs.map((value) => String(value))
        : [],
    },
  };
}

