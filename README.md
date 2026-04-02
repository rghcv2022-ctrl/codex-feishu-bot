# Codex Feishu Bot

Feishu private-message bot that forwards user messages to a local `codex` CLI session and sends the reply back to Feishu.

This repository is prepared for GitHub publishing and intentionally excludes real credentials, personal IDs, private deployment paths, and local runtime state.

## Why this project exists

If you already use Codex locally, Feishu is a convenient front end for talking to it from your phone or desktop chat client.

This bot keeps the design simple:

- Feishu DM in
- local Codex turn execution
- reply back to Feishu
- per-contact conversation state persisted on disk

## Highlights

- Feishu self-built app integration via long connection (WebSocket)
- One Codex thread per Feishu contact
- `/new` and `/reset` to clear conversation context
- Plain text replies optimized for Feishu direct messages
- Config and runtime state stored outside the repository
- Windows helper scripts for quick local usage
- Linux `systemd --user` service template for persistent background deployment

## Current scope

This project is intentionally narrow and predictable.

Supported well:

- Feishu private text messages
- one conversation state per contact
- local Codex CLI invocation
- lightweight self-hosted personal use

Not the goal right now:

- group chat workflows
- attachments / images / voice input
- multi-tenant access control
- admin dashboard
- cloud-native production architecture

## Architecture

```text
Feishu user
   ↓
Feishu bot event (WebSocket)
   ↓
Message parsing / filtering
   ↓
Per-user queue + state lookup
   ↓
Local codex CLI execution
   ↓
Thread ID persistence
   ↓
Reply chunking
   ↓
Feishu DM response
```

## Project structure

```text
src/
  config.js                  Config loading and validation
  codex.js                   Codex CLI execution wrapper
  feishu.js                  Feishu API + WebSocket helpers
  index.js                   Main event loop
  state.js                   Per-user message/thread persistence
config.example.json          Public-safe config example
deploy/codex-feishu-bot.service  Example systemd user service
probe-bot.cmd                Windows helper to verify Feishu config
start-bot.cmd                Windows helper to start the bot
```

## Requirements

- Node.js 18+
- `codex` CLI installed and available in `PATH`
- A Feishu self-built app with bot capability enabled
- Permission for the app to receive and send bot messages

## Feishu app setup

Create a self-built Feishu app and enable:

- Bot capability
- Long connection / event subscription
- Event subscription: `im.message.receive_v1`

Make sure the app has permission to:

- receive bot messages
- send bot messages

Then install the app for the account(s) that should talk to the bot.

## Quick start

```bash
git clone https://github.com/<your-account>/codex-feishu-bot.git
cd codex-feishu-bot
npm install
```

Copy the example config to your real config location and fill in your own values.

Default config path:

- Linux/macOS: `~/.config/codex-feishu-bot/config.json`
- Windows: `%USERPROFILE%\.config\codex-feishu-bot\config.json`

You can also override it with:

```bash
CODEX_FEISHU_CONFIG=/absolute/path/to/config.json
```

Verify the Feishu configuration first:

```bash
npm run probe
```

Then start the bot:

```bash
npm start
```

## Example config

See `config.example.json` for the full public-safe template.

Important fields:

- `appId`: your Feishu app ID
- `appSecret`: your Feishu app secret
- `workspace`: directory where `codex` should run
- `dataDir`: directory where the bot stores thread and message state
- `replyChunkChars`: chunk size for long Feishu replies
- `codex.model`: optional model override for the local Codex call
- `codex.extraArgs`: optional additional CLI arguments
- `systemPrompt`: prompt prefix added before each Codex turn

## Windows usage

Helper scripts are included for convenience:

```bat
probe-bot.cmd
start-bot.cmd
```

## Linux background deployment

A sample `systemd --user` service is included at:

```text
deploy/codex-feishu-bot.service
```

Typical install flow:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/codex-feishu-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now codex-feishu-bot.service
systemctl --user status codex-feishu-bot.service
```

## Feishu commands

- `/new` — start a fresh Codex conversation
- `/reset` — clear saved conversation context

## Security model

This repository is meant to be publishable, but your actual deployment is still sensitive.

Rules worth keeping:

- Never commit a real `config.json`
- Never commit a real `appSecret`
- Keep runtime state outside the repository
- Review `codex.extraArgs` before using them in production
- Restrict who can talk to the bot if you expose it beyond personal use
- Treat the bot host like any other machine with local CLI access

## Troubleshooting

If `npm run probe` fails:

- verify the Feishu app ID and secret
- verify the app permissions and event subscription
- verify the app is installed for the target account

If Codex replies fail:

- make sure `codex` works in the configured `workspace`
- check whether the configured model / extra args are valid
- try `/reset` to clear broken thread state

If the bot starts but does not answer:

- verify the incoming message is a private text message
- verify the app is receiving `im.message.receive_v1`
- inspect local logs for Codex CLI failures

If persistence behaves strangely:

- inspect the configured `dataDir`
- confirm the process can read and write that directory

## Publish checklist

Before pushing changes publicly, confirm that you did not commit:

- real Feishu credentials
- private `config.json`
- machine-specific secret paths
- exported chat history
- runtime state or logs

## Roadmap ideas

Useful next steps if you want to keep developing this:

- allowlist for permitted Feishu users
- better structured logging
- richer health checks
- attachment-aware workflows
- Docker deployment option
- configurable reply style / language presets

## Contributing

This repository is currently positioned as a small practical example rather than a fully formal open-source platform.

If you reuse it, keep the public repo clean and keep your real credentials outside version control.

## License

Add your preferred license before broader public sharing.
