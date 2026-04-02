@echo off
setlocal
set CODEX_FEISHU_CONFIG=%USERPROFILE%\.config\codex-feishu-bot\config.json
cd /d %~dp0
node src\index.js --probe
