# Codex Feishu Bot

A lightweight Feishu DM bot that forwards private messages to your local `codex` CLI and sends the reply back to Feishu.

This repository is safe to publish as a template/example: it does **not** include any real Feishu credentials, user IDs, machine names, or private deployment paths.

## Features

- Feishu self-built app integration over long connection (WebSocket)
- One Codex conversation thread per Feishu contact
- `/new` and `/reset` to clear the current conversation
- Plain text replies optimized for Feishu direct messages
- Separate config and state outside the repository
- Windows helper scripts and a Linux `systemd --user` service template

## How It Works

1. A user sends a private text message to the Feishu bot.
2. The bot receives the message through Feishu events.
3. The message is forwarded to the local `codex` CLI.
4. The bot stores the returned thread ID for that Feishu contact.
5. The Codex reply is sent back to Feishu.

## Requirements

- Node.js 18+
- `codex` CLI installed and available in `PATH`
- A Feishu self-built app with bot capability enabled
- Permission to receive and send bot messages in Feishu

## Feishu App Setup

Create a self-built Feishu app and enable:

- Bot capability
- Long connection / event subscription
- Event: `im.message.receive_v1`

Grant the permissions required for:

- Receiving bot messages
- Sending bot messages

Then install the app for the account(s) that should talk to the bot.

## Project Structure

```text
src/                         Application source
  config.js                  Config loading and validation
  codex.js                   Codex CLI execution
  feishu.js                  Feishu API + WebSocket client helpers
  index.js                   Main event loop
  state.js                   Per-user thread/message state
config.example.json          Public-safe config example
start-bot.cmd                Windows helper to start the bot
probe-bot.cmd                Windows helper to verify credentials
deploy/codex-feishu-bot.service  Example systemd user service
```

## Installation

```bash
git clone <your-repo-url>
cd codex-feishu-bot
npm install
```

## Configuration

Copy `config.example.json` to your real config location and fill in your own values.

Default config path used by the app:

- Linux/macOS: `~/.config/codex-feishu-bot/config.json`
- Windows: `%USERPROFILE%\.config\codex-feishu-bot\config.json`

You can also override the path with:

```bash
CODEX_FEISHU_CONFIG=/absolute/path/to/config.json
```

### Example Config

See `config.example.json`.

Important fields:

- `appId`: your Feishu app ID
- `appSecret`: your Feishu app secret
- `workspace`: the directory where Codex should run
- `dataDir`: where the bot stores message/thread state
- `replyChunkChars`: message chunk size for long replies
- `codex.model`: optional Codex model name
- `codex.extraArgs`: optional extra CLI arguments
- `systemPrompt`: default prompt prepended to each Codex turn

## Usage

### Verify the Feishu credentials first

```bash
npm run probe
```

Or with an explicit config path:

```bash
CODEX_FEISHU_CONFIG=/absolute/path/to/config.json npm run probe
```

### Start the bot

```bash
npm start
```

Or with an explicit config path:

```bash
CODEX_FEISHU_CONFIG=/absolute/path/to/config.json npm start
```

### Windows helpers

```bat
probe-bot.cmd
start-bot.cmd
```

## Commands in Feishu

- `/new` — start a fresh Codex conversation
- `/reset` — clear the saved conversation context

## Deployment

### systemd user service (Linux)

A template service file is included at:

```text
deploy/codex-feishu-bot.service
```

Copy it into your user service directory, then adjust paths if needed:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/codex-feishu-bot.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now codex-feishu-bot.service
systemctl --user status codex-feishu-bot.service
```

## Security Notes

- Never commit your real `appSecret`, access tokens, or private config files.
- Keep the real config file outside the repository.
- Review any `codex.extraArgs` before enabling them in production.
- If you expose this beyond your own Feishu account, add stronger access controls and logging.
- The bot is currently designed for Feishu private text messages only.

## Troubleshooting

- If `npm run probe` fails, verify the Feishu app ID, secret, permissions, and installation status.
- If Codex replies fail, make sure the `codex` command works in the configured `workspace`.
- If thread resume fails, clear the conversation with `/reset` and try again.
- If the service cannot read the config or write state, fix the config/data directory permissions.

## Publish Checklist

Before pushing to GitHub, confirm that you did **not** commit:

- Real `config.json`
- Real Feishu credentials
- Private workspace paths tied to one machine
- Logs or exported message history
- Local state files

## License

Add your preferred license before publishing if this repository will be shared publicly.
