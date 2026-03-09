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

# ── run-grouped line formatter ─────────────────────────────────
# Detects "=== RUN <timestamp> ===" boundaries and groups output.
# Falls back to per-line timestamps for lines outside a run block.
format_lines() {
  local agent="$1"
  local color
  color=$(color_for_agent "$agent")
  local tag="\033[${color}m[${agent}]\033[0m"
  local separator="─────────────────────────"

  while IFS= read -r line; do
    # Run boundary marker from run.sh
    if [[ "$line" =~ ^===\ RUN\ ([0-9T:.Z-]+)\ ===$ ]]; then
      local run_ts="${BASH_REMATCH[1]}"
      # Convert ISO timestamp to HH:MM:SS for display
      local display_ts
      display_ts=$(date -jf '%Y-%m-%dT%H:%M:%SZ' "$run_ts" '+%H:%M:%S' 2>/dev/null || echo "$run_ts")
      printf "\n%b \033[90m%s\033[0m \033[90m%s\033[0m\n" "$tag" "$display_ts" "$separator"
      continue
    fi
    [[ -z "$line" ]] && continue
    printf "  %s\n" "$line"
  done
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

  if $FOLLOW; then
    tail -n "$LINES" -f "$LOG_FILE" | format_lines "$AGENT"
  else
    tail -n "$LINES" "$LOG_FILE" | format_lines "$AGENT"
  fi
  exit 0
fi

# ── all agents mode ───────────────────────────────────────────
# Collect agent log files, excluding the system log
LOG_FILES=()
for f in "${LOGS_DIR}"/*.log; do
  [[ ! -e "$f" ]] && continue
  [[ "$(basename "$f")" == "system.log" ]] && continue
  LOG_FILES+=("$f")
done

if [[ ${#LOG_FILES[@]} -eq 0 ]]; then
  echo "No log files found in ${LOGS_DIR}/" >&2
  exit 1
fi

if $FOLLOW; then
  CURRENT_AGENT="unknown"
  tail -n "$LINES" -f "${LOG_FILES[@]}" 2>/dev/null | while IFS= read -r line; do
    # tail -f prefixes with "==> path <=="; extract agent ID from filename
    if [[ "$line" =~ ^==\>\ (.+)\ \<== ]]; then
      filepath="${BASH_REMATCH[1]}"
      basename="${filepath##*/}"
      CURRENT_AGENT="${basename%.log}"
      continue
    fi
    [[ -z "$line" ]] && continue

    # Run boundary marker
    if [[ "$line" =~ ^===\ RUN\ ([0-9T:.Z-]+)\ ===$ ]]; then
      local_color=$(color_for_agent "$CURRENT_AGENT")
      local_tag="\033[${local_color}m[${CURRENT_AGENT}]\033[0m"
      run_ts="${BASH_REMATCH[1]}"
      display_ts=$(date -jf '%Y-%m-%dT%H:%M:%SZ' "$run_ts" '+%H:%M:%S' 2>/dev/null || echo "$run_ts")
      printf "\n%b \033[90m%s\033[0m \033[90m%s\033[0m\n" "$local_tag" "$display_ts" "─────────────────────────"
      continue
    fi

    printf "  %s\n" "$line"
  done
else
  # Show last N lines from each agent, grouped by run
  for log_file in "${LOG_FILES[@]}"; do
    basename="${log_file##*/}"
    agent="${basename%.log}"
    tail -n "$LINES" "$log_file" | format_lines "$agent"
  done
fi
