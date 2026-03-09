#!/usr/bin/env bash
# Pretty log viewer for agent-kernel logs.
# Usage:
#   ./view.sh              — tail all agent logs interleaved
#   ./view.sh worker-01    — tail a specific agent's log
#   ./view.sh -f           — follow all agents live
#   ./view.sh -f worker-01 — follow a specific agent live

set -euo pipefail

LOGS_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── color palette ──────────────────────────────────────────────
# Assign colors by agent ID. Cycles through a fixed palette.
COLORS=(
  "34"  # blue
  "32"  # green
  "33"  # yellow
  "35"  # magenta
  "36"  # cyan
  "91"  # bright red
  "92"  # bright green
  "93"  # bright yellow
  "94"  # bright blue
  "95"  # bright magenta
)

color_for_agent() {
  local agent="$1"
  local hash=0
  for (( i=0; i<${#agent}; i++ )); do
    hash=$(( (hash + $(printf '%d' "'${agent:$i:1}")) % ${#COLORS[@]} ))
  done
  echo "${COLORS[$hash]}"
}

# ── parse args ─────────────────────────────────────────────────
FOLLOW=false
AGENT=""
LINES=50

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--follow) FOLLOW=true; shift ;;
    -n)          LINES="$2"; shift 2 ;;
    -*)          echo "Usage: $0 [-f] [-n lines] [agent-id]" >&2; exit 1 ;;
    *)           AGENT="$1"; shift ;;
  esac
done

# ── single agent mode ─────────────────────────────────────────
if [[ -n "$AGENT" ]]; then
  LOG_FILE="${LOGS_DIR}/${AGENT}.log"
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "No log file found: ${LOG_FILE}" >&2
    exit 1
  fi

  COLOR=$(color_for_agent "$AGENT")
  TAG="\033[${COLOR}m[${AGENT}]\033[0m"

  if $FOLLOW; then
    tail -n "$LINES" -f "$LOG_FILE" | while IFS= read -r line; do
      ts=$(date '+%H:%M:%S')
      printf "\033[90m%s\033[0m %b %s\n" "$ts" "$TAG" "$line"
    done
  else
    tail -n "$LINES" "$LOG_FILE" | while IFS= read -r line; do
      ts=$(date '+%H:%M:%S')
      printf "\033[90m%s\033[0m %b %s\n" "$ts" "$TAG" "$line"
    done
  fi
  exit 0
fi

# ── all agents mode ───────────────────────────────────────────
LOG_FILES=("${LOGS_DIR}"/*.log)

if [[ ! -e "${LOG_FILES[0]}" ]]; then
  echo "No log files found in ${LOGS_DIR}/" >&2
  exit 1
fi

if $FOLLOW; then
  # Use tail -f on all log files, prefix each line with the agent tag
  tail -n "$LINES" -f "${LOG_FILES[@]}" 2>/dev/null | while IFS= read -r line; do
    # tail -f prefixes with "==> path <=="; extract agent ID from filename
    if [[ "$line" =~ ^==\>\ (.+)\ \<== ]]; then
      filepath="${BASH_REMATCH[1]}"
      basename="${filepath##*/}"
      CURRENT_AGENT="${basename%.log}"
      continue
    fi
    [[ -z "$line" ]] && continue
    COLOR=$(color_for_agent "${CURRENT_AGENT:-unknown}")
    TAG="\033[${COLOR}m[${CURRENT_AGENT:-unknown}]\033[0m"
    ts=$(date '+%H:%M:%S')
    printf "\033[90m%s\033[0m %b %s\n" "$ts" "$TAG" "$line"
  done
else
  # Show last N lines from each agent
  for log_file in "${LOG_FILES[@]}"; do
    basename="${log_file##*/}"
    agent="${basename%.log}"
    COLOR=$(color_for_agent "$agent")
    TAG="\033[${COLOR}m[${agent}]\033[0m"

    tail -n "$LINES" "$log_file" | while IFS= read -r line; do
      ts=$(date '+%H:%M:%S')
      printf "\033[90m%s\033[0m %b %s\n" "$ts" "$TAG" "$line"
    done
  done
fi
