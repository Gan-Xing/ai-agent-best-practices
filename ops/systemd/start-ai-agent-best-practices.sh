#!/usr/bin/env sh
set -eu

NODE_BIN="/home/ubuntu/.nvm/versions/node/v24.15.0/bin/node"
NEXT_BIN="/home/ubuntu/dev/ai-agent-best-practices/node_modules/next/dist/bin/next"
APP_PORT="${PORT:-3020}"

if [ -n "${APP_HOST:-}" ]; then
  exec "$NODE_BIN" "$NEXT_BIN" start -H "$APP_HOST" -p "$APP_PORT"
fi

exec "$NODE_BIN" "$NEXT_BIN" start -p "$APP_PORT"
