#!/usr/bin/env sh
set -eu

umask 077

APP_DIR="/home/ubuntu/dev/ai-agent-best-practices"
NODE_BIN="/home/ubuntu/.nvm/versions/node/v24.15.0/bin/node"
ALERT_DIR="$APP_DIR/runtime/alerts/github-sync"
HISTORY_DIR="$ALERT_DIR/history"
FAILED_UNIT="${1:-}"

if [ -z "$FAILED_UNIT" ]; then
  echo "Usage: $0 <failed-unit>" >&2
  exit 2
fi

mkdir -p "$HISTORY_DIR"

STATUS_FILE="$(mktemp)"
JOURNAL_FILE="$(mktemp)"
trap 'rm -f "$STATUS_FILE" "$JOURNAL_FILE"' EXIT INT TERM

if ! systemctl show "$FAILED_UNIT" \
  --property=Id \
  --property=Result \
  --property=ExecMainCode \
  --property=ExecMainStatus \
  --property=InvocationID \
  --property=ActiveEnterTimestamp \
  --property=ActiveExitTimestamp \
  --property=StateChangeTimestamp \
  --property=FragmentPath \
  --property=UnitFileState \
  --property=MainPID \
  --property=SubState \
  --property=Description \
  >"$STATUS_FILE"; then
  echo "Id=$FAILED_UNIT" >"$STATUS_FILE"
  echo "Result=unknown" >>"$STATUS_FILE"
fi

journalctl -u "$FAILED_UNIT" -n 120 --no-pager -o short-iso-precise >"$JOURNAL_FILE" || true

export APP_DIR ALERT_DIR HISTORY_DIR STATUS_FILE JOURNAL_FILE FAILED_UNIT HOSTNAME="${HOSTNAME:-$(hostname)}"

RESULT_JSON="$("$NODE_BIN" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const alertDir = process.env.ALERT_DIR;
const historyDir = process.env.HISTORY_DIR;
const failedUnit = process.env.FAILED_UNIT;
const host = process.env.HOSTNAME || 'unknown-host';

function parseProps(text) {
  const result = {};
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    result[key] = value;
  }
  return result;
}

function safeSlug(input) {
  return input.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

const statusProps = parseProps(fs.readFileSync(process.env.STATUS_FILE, 'utf8'));
const journalText = fs.readFileSync(process.env.JOURNAL_FILE, 'utf8').trim();
const journalTail = journalText ? journalText.split('\n') : [];
const now = new Date();
const iso = now.toISOString();
const stamp = iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const unitSafe = safeSlug(failedUnit);
const summaryText = [
  'AI Agent Best Practices weekly GitHub upstream sync failed.',
  `Host: ${host}`,
  `Unit: ${failedUnit}`,
  `Result: ${statusProps.Result || 'unknown'}`,
  `Exit: ${statusProps.ExecMainCode || 'n/a'} / ${statusProps.ExecMainStatus || 'n/a'}`,
  `When: ${iso}`,
  `Inspect: journalctl -u ${failedUnit} -n 120 --no-pager`,
  'Retry: cd /home/ubuntu/dev/ai-agent-best-practices && pnpm resources:github:sync-upstreams -- --all',
].join('\n');

const payload = {
  kind: 'github-upstream-sync-failure',
  source: 'ai-agent-best-practices',
  title: 'AI Agent Best Practices GitHub weekly sync failed',
  severity: 'error',
  createdAt: iso,
  host,
  failedUnit,
  status: {
    result: statusProps.Result || null,
    execMainCode: statusProps.ExecMainCode || null,
    execMainStatus: statusProps.ExecMainStatus || null,
    invocationId: statusProps.InvocationID || null,
    activeEnterTimestamp: statusProps.ActiveEnterTimestamp || null,
    activeExitTimestamp: statusProps.ActiveExitTimestamp || null,
    stateChangeTimestamp: statusProps.StateChangeTimestamp || null,
    subState: statusProps.SubState || null,
    mainPid: statusProps.MainPID || null,
    description: statusProps.Description || null,
    fragmentPath: statusProps.FragmentPath || null,
    unitFileState: statusProps.UnitFileState || null,
  },
  summaryText,
  inspectCommand: `journalctl -u ${failedUnit} -n 120 --no-pager`,
  retryCommand: 'cd /home/ubuntu/dev/ai-agent-best-practices && pnpm resources:github:sync-upstreams -- --all',
  journalTail,
};

fs.mkdirSync(historyDir, { recursive: true });
fs.mkdirSync(alertDir, { recursive: true });

const historyJsonPath = path.join(historyDir, `${stamp}-${unitSafe}.json`);
const historyTxtPath = path.join(historyDir, `${stamp}-${unitSafe}.txt`);
const latestJsonPath = path.join(alertDir, 'latest-failure.json');
const latestTxtPath = path.join(alertDir, 'latest-failure.txt');

fs.writeFileSync(historyJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(historyTxtPath, `${summaryText}\n\n${journalText || '(no journal lines captured)'}\n`, 'utf8');
fs.writeFileSync(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
fs.writeFileSync(latestTxtPath, `${summaryText}\n\n${journalText || '(no journal lines captured)'}\n`, 'utf8');

process.stdout.write(JSON.stringify({
  ok: true,
  latestJsonPath,
  latestTxtPath,
  historyJsonPath,
  historyTxtPath,
  summaryText,
}));
NODE
)"

LATEST_JSON_PATH="$("$NODE_BIN" -e "const payload = JSON.parse(process.argv[1]); process.stdout.write(payload.latestJsonPath);" "$RESULT_JSON")"
SUMMARY_TEXT="$("$NODE_BIN" -e "const payload = JSON.parse(process.argv[1]); process.stdout.write(payload.summaryText);" "$RESULT_JSON")"

logger -p user.err -t ai-agent-best-practices-github-sync-alert "$SUMMARY_TEXT"

if [ -n "${GITHUB_SYNC_ALERT_WEBHOOK_URL:-}" ]; then
  set -- -fsS --max-time 20 -X POST -H "Content-Type: application/json"

  if [ -n "${GITHUB_SYNC_ALERT_WEBHOOK_BEARER_TOKEN:-}" ]; then
    set -- "$@" -H "Authorization: Bearer ${GITHUB_SYNC_ALERT_WEBHOOK_BEARER_TOKEN}"
  fi

  if ! curl "$@" --data-binary "@${LATEST_JSON_PATH}" "${GITHUB_SYNC_ALERT_WEBHOOK_URL}"; then
    logger -p user.warning -t ai-agent-best-practices-github-sync-alert "Failed to deliver GitHub sync failure webhook."
  fi
fi

printf '%s\n' "$RESULT_JSON"
