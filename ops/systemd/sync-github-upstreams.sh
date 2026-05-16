#!/usr/bin/env sh
set -eu

APP_DIR="/home/ubuntu/dev/ai-agent-best-practices"
PNPM_BIN="/home/ubuntu/.nvm/versions/node/v24.15.0/bin/pnpm"
LOCK_DIR="/home/ubuntu/.cache/ai-agent-best-practices"
LOCK_FILE="$LOCK_DIR/github-upstreams-sync.lock"

mkdir -p "$LOCK_DIR"
cd "$APP_DIR"

export PATH="/home/ubuntu/.nvm/versions/node/v24.15.0/bin:$PATH"
export NODE_ENV="${NODE_ENV:-production}"

status=0
/usr/bin/flock -n -E 75 "$LOCK_FILE" \
  "$PNPM_BIN" resources:github:sync-upstreams -- --all || status=$?

if [ "$status" -eq 0 ]; then
  exit 0
fi

if [ "$status" -eq 75 ]; then
  echo "GitHub upstream sync skipped because another run is already in progress."
  exit 0
fi

exit "$status"
