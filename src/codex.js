import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function buildPrompt({ systemPrompt, senderName, openId, text }) {
  const lines = [
    systemPrompt,
    "",
    "Channel: Feishu direct message",
    `Sender open_id: ${openId}`,
  ];
  if (senderName) {
    lines.push(`Sender name: ${senderName}`);
  }
  lines.push("", text.trim());
  return lines.join("\n");
}

function parseThreadId(stdout) {
  let threadId = null;
  for (const line of stdout.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const event = JSON.parse(trimmed);
      if (event.type === "thread.started" && typeof event.thread_id === "string") {
        threadId = event.thread_id;
      }
    } catch {
      continue;
    }
  }
  return threadId;
}

export async function runCodexTurn({ config, threadId, senderName, openId, text }) {
  const outputFile = path.join(
    os.tmpdir(),
    `codex-feishu-bot-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`,
  );
  const prompt = buildPrompt({
    systemPrompt: config.systemPrompt,
    senderName,
    openId,
    text,
  });

  const args = threadId
    ? ["exec", "resume"]
    : ["exec"];

  if (config.codex.extraArgs.length > 0) {
    args.push(...config.codex.extraArgs);
  }

  args.push("--skip-git-repo-check", "--json", "-o", outputFile);

  if (!threadId) {
    args.push("-C", config.workspace);
  }

  if (config.codex.model) {
    args.push("-m", config.codex.model);
  }
  if (threadId) {
    args.push(threadId, prompt);
  } else {
    args.push(prompt);
  }

  const stdout = await new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: config.workspace,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderrBuffer.trim() || `codex exited with code ${code}`));
        return;
      }
      resolve(stdoutBuffer);
    });
  });

  const nextThreadId = parseThreadId(stdout) || threadId;
  const reply = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8").trim() : "";
  fs.rmSync(outputFile, { force: true });

  if (!reply) {
    throw new Error("Codex returned an empty reply");
  }

  return {
    threadId: nextThreadId,
    reply,
  };
}
