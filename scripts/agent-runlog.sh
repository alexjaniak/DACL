#!/usr/bin/env bash
set -euo pipefail

# Resolve and optionally initialize canonical per-run agent memory log.
#
# Usage:
#   ./scripts/agent-runlog.sh --agent-id <id> --role <role> --run-id <run-id> [--repo <repo>] [--date YYYY-MM-DD] [--timestamp "YYYY-MM-DD HH:MM UTC"] [--dry-run]
#
# Output:
#   Prints resolved target path to stdout.

AGENT_ID=""
ROLE=""
RUN_ID=""
REPO_LABEL=""
DATE_UTC="$(date -u +%F)"
TIMESTAMP_UTC="$(date -u +"%Y-%m-%d %H:%M UTC")"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-id)
      AGENT_ID="${2:-}"
      shift 2
      ;;
    --role)
      ROLE="${2:-}"
      shift 2
      ;;
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --repo)
      REPO_LABEL="${2:-}"
      shift 2
      ;;
    --date)
      DATE_UTC="${2:-}"
      shift 2
      ;;
    --timestamp)
      TIMESTAMP_UTC="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$AGENT_ID" || -z "$ROLE" || -z "$RUN_ID" ]]; then
  echo "Missing required arguments: --agent-id, --role, --run-id" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ -z "$REPO_LABEL" ]]; then
  REPO_LABEL="$(basename "$REPO_ROOT")"
fi

TEMPLATE_FILE="$REPO_ROOT/operatives/RUN_LOG_TEMPLATE.md"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Template not found: $TEMPLATE_FILE" >&2
  exit 1
fi

TARGET_DIR="$REPO_ROOT/agents/memory/$AGENT_ID/$DATE_UTC"
TARGET_PATH="$TARGET_DIR/$RUN_ID.md"

if [[ $DRY_RUN -eq 0 ]]; then
  mkdir -p "$TARGET_DIR"
  if [[ ! -f "$TARGET_PATH" ]]; then
    sed \
      -e "s/{{agent_id}}/$AGENT_ID/g" \
      -e "s/{{role}}/$ROLE/g" \
      -e "s/{{timestamp_utc}}/$TIMESTAMP_UTC/g" \
      -e "s/{{run_id}}/$RUN_ID/g" \
      -e "s|{{repo}}|$REPO_LABEL|g" \
      "$TEMPLATE_FILE" > "$TARGET_PATH"
  fi
fi

echo "$TARGET_PATH"
