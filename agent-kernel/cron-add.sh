#!/usr/bin/env bash
set -euo pipefail

KERNEL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$KERNEL_DIR/.." && pwd)"
TAG_PREFIX="# DACL:agent-kernel"

# ── usage ──────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 <id> <interval> \"<prompt>\" [--agentic]" >&2
  echo "" >&2
  echo "  id        Job identifier (e.g. pr-checker)" >&2
  echo "  interval  Cron interval: Nm (minutes), Nh (hours)" >&2
  echo "  prompt    Prompt string for run.sh" >&2
  echo "  --agentic Enable tool use (optional)" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  $0 pr-checker 5m \"Check for stale PRs\" --agentic" >&2
  echo "  $0 daily-summary 1h \"Summarize today's activity\"" >&2
  exit 1
}

# ── parse args ─────────────────────────────────────────────────
[[ $# -lt 3 ]] && usage

ID="$1"; shift
INTERVAL="$1"; shift

AGENTIC=false
PROMPT=""
for arg in "$@"; do
  case "$arg" in
    --agentic) AGENTIC=true ;;
    *)         PROMPT="$arg" ;;
  esac
done

[[ -z "$PROMPT" ]] && usage

# ── parse interval → cron expression ──────────────────────────
CRON_EXPR=""
if [[ "$INTERVAL" =~ ^([0-9]+)m$ ]]; then
  MINS="${BASH_REMATCH[1]}"
  CRON_EXPR="*/$MINS * * * *"
elif [[ "$INTERVAL" =~ ^([0-9]+)h$ ]]; then
  HOURS="${BASH_REMATCH[1]}"
  CRON_EXPR="0 */$HOURS * * *"
else
  echo "Error: interval must be Nm or Nh (e.g. 5m, 1h)" >&2
  exit 1
fi

# ── build run.sh command ──────────────────────────────────────
RUN_CMD="cd $REPO_DIR && ./agent-kernel/run.sh"
if [[ "$AGENTIC" == true ]]; then
  RUN_CMD="$RUN_CMD --agentic"
fi
RUN_CMD="$RUN_CMD \"$PROMPT\" >> /tmp/agent-kernel-$ID.log 2>&1"

CRON_LINE="$CRON_EXPR $RUN_CMD"
TAG_LINE="$TAG_PREFIX:$ID"

# ── remove existing entry with same ID (if any) ──────────────
EXISTING=$(crontab -l 2>/dev/null || true)
CLEANED=$(echo "$EXISTING" | awk -v tag="$TAG_LINE" '
  $0 == tag { skip=1; next }
  skip { skip=0; next }
  { print }
')

# ── add new entry ─────────────────────────────────────────────
NEW_CRONTAB="$CLEANED
$TAG_LINE
$CRON_LINE"

# trim leading blank lines
NEW_CRONTAB=$(echo "$NEW_CRONTAB" | sed '/./,$!d')

echo "$NEW_CRONTAB" | crontab -

echo "Added cron job '$ID' ($INTERVAL): $CRON_EXPR"
echo "  Prompt: $PROMPT"
echo "  Log: /tmp/agent-kernel-$ID.log"
