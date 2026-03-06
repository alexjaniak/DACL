#!/usr/bin/env bash
set -euo pipefail

TAG_PREFIX="# DACL:agent-kernel"

# ── usage ──────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <id>" >&2
  echo "" >&2
  echo "Example:" >&2
  echo "  $0 pr-checker" >&2
  exit 1
fi

ID="$1"
TAG_LINE="$TAG_PREFIX:$ID"

# ── read current crontab ──────────────────────────────────────
EXISTING=$(crontab -l 2>/dev/null || true)

if ! echo "$EXISTING" | grep -qF "$TAG_LINE"; then
  echo "No cron job found with id '$ID'" >&2
  exit 1
fi

# ── remove tag line + the cron line after it ──────────────────
CLEANED=$(echo "$EXISTING" | awk -v tag="$TAG_LINE" '
  $0 == tag { skip=1; next }
  skip { skip=0; next }
  { print }
')

if [[ -z "$CLEANED" ]]; then
  crontab -r 2>/dev/null || true
else
  echo "$CLEANED" | crontab -
fi

echo "Removed cron job '$ID'"
