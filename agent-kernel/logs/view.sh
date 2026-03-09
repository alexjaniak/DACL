#!/usr/bin/env bash
# Pretty log viewer for agent-kernel logs.
# Usage:
#   ./view.sh              — tail all agent logs interleaved
#   ./view.sh worker-01    — tail a specific agent's log
#   ./view.sh -f           — follow all agent logs live
#   ./view.sh worker-01 -f — follow a specific agent's log live

set -euo pipefail

LOGS_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Color assignments by agent ID ─────────────────────────────
declare -A AGENT_COLORS
COLORS=(
  "\033[1;34m"  # blue
  "\033[1;32m"  # green
  "\033[1;33m"  # yellow
  "\033[1;35m"  # magenta
  "\033[1;36m"  # cyan
  "\033[1;31m"  # red
  "\033[1;37m"  # white
  "\033[1;38;5;208m"  # orange
)
RESET="\033[0m"
COLOR_INDEX=0

get_color() {
  local agent="$1"
  if [[ -z "${AGENT_COLORS[$agent]+x}" ]]; then
    AGENT_COLORS[$agent]="${COLORS[$COLOR_INDEX]}"
    COLOR_INDEX=$(( (COLOR_INDEX + 1) % ${#COLORS[@]} ))
  fi
  echo -e "${AGENT_COLORS[$agent]}"
}

# ── Parse arguments ───────────────────────────────────────────
FOLLOW=false
AGENT_ID=""

for arg in "$@"; do
  case "$arg" in
    -f|--follow) FOLLOW=true ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) AGENT_ID="$arg" ;;
  esac
done

# ── Single agent mode ────────────────────────────────────────
if [[ -n "$AGENT_ID" ]]; then
  LOG_FILE="$LOGS_DIR/$AGENT_ID.log"
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "No log file found: $LOG_FILE" >&2
    exit 1
  fi
  COLOR=$(get_color "$AGENT_ID")
  TAG="${COLOR}[$AGENT_ID]${RESET}"
  if $FOLLOW; then
    tail -f -n 50 "$LOG_FILE" | while IFS= read -r line; do
      echo -e "$TAG $line"
    done
  else
    tail -n 50 "$LOG_FILE" | while IFS= read -r line; do
      echo -e "$TAG $line"
    done
  fi
  exit 0
fi

# ── All agents mode ──────────────────────────────────────────
LOG_FILES=("$LOGS_DIR"/*.log)

if [[ ! -e "${LOG_FILES[0]}" ]]; then
  echo "No log files found in $LOGS_DIR" >&2
  exit 1
fi

if $FOLLOW; then
  # Use tail -f on all files and prefix each line with the agent ID
  tail -f -n 10 "${LOG_FILES[@]}" 2>/dev/null | while IFS= read -r line; do
    # tail -f outputs "==> path <==\n" headers when switching files
    if [[ "$line" =~ ^==\>\ (.+)\ \<==$ ]]; then
      filepath="${BASH_REMATCH[1]}"
      current_agent="$(basename "$filepath" .log)"
      continue
    fi
    if [[ -z "$line" ]]; then
      continue
    fi
    COLOR=$(get_color "${current_agent:-unknown}")
    echo -e "${COLOR}[${current_agent:-unknown}]${RESET} $line"
  done
else
  # Show last 20 lines per agent, interleaved by file
  for log_file in "${LOG_FILES[@]}"; do
    agent="$(basename "$log_file" .log)"
    COLOR=$(get_color "$agent")
    TAG="${COLOR}[$agent]${RESET}"
    tail -n 20 "$log_file" | while IFS= read -r line; do
      echo -e "$TAG $line"
    done
  done
fi
