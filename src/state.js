import fs from "node:fs";
import path from "node:path";

const STATE_VERSION = 1;
const MAX_RECENT_MESSAGE_IDS = 500;

export class StateStore {
  constructor(dataDir) {
    this.filePath = path.join(dataDir, "state.json");
    this.state = this.#load();
  }

  #load() {
    if (!fs.existsSync(this.filePath)) {
      return {
        version: STATE_VERSION,
        users: {},
        recentMessageIds: [],
      };
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      return {
        version: STATE_VERSION,
        users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
        recentMessageIds: Array.isArray(parsed.recentMessageIds) ? parsed.recentMessageIds : [],
      };
    } catch {
      return {
        version: STATE_VERSION,
        users: {},
        recentMessageIds: [],
      };
    }
  }

  save() {
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }

  hasMessage(messageId) {
    return this.state.recentMessageIds.includes(messageId);
  }

  rememberMessage(messageId) {
    this.state.recentMessageIds.push(messageId);
    if (this.state.recentMessageIds.length > MAX_RECENT_MESSAGE_IDS) {
      this.state.recentMessageIds = this.state.recentMessageIds.slice(-MAX_RECENT_MESSAGE_IDS);
    }
    this.save();
  }

  getUser(openId) {
    return this.state.users[openId] || null;
  }

  upsertUser(openId, patch) {
    const next = {
      ...(this.state.users[openId] || {}),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.state.users[openId] = next;
    this.save();
    return next;
  }

  clearThread(openId) {
    const current = this.state.users[openId] || {};
    this.state.users[openId] = {
      ...current,
      threadId: null,
      updatedAt: new Date().toISOString(),
    };
    this.save();
  }
}

