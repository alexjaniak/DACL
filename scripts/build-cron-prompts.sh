#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/agents/operatives/cron/generated"
mkdir -p "$OUT_DIR"

assemble() {
  local out="$1"
  shift
  : > "$out"
  for f in "$@"; do
    echo "# BEGIN: ${f#$ROOT/}" >> "$out"
    cat "$f" >> "$out"
    echo >> "$out"
    echo "# END: ${f#$ROOT/}" >> "$out"
    echo >> "$out"
  done
}

assemble "$OUT_DIR/PLANNER_PROMPT.txt" \
  "$ROOT/agents/operatives/ISSUE_PR_PROTOCOL.md" \
  "$ROOT/agents/operatives/COMMENT_STYLE.md" \
  "$ROOT/agents/operatives/PLANNER.md" \
  "$ROOT/agents/operatives/ORCHESTRATOR_UNSTUCK.md" \
  "$ROOT/agents/operatives/cron/PLANNER_RUNTIME_TAIL.txt"

assemble "$OUT_DIR/WORKER_PROMPT.txt" \
  "$ROOT/agents/operatives/ISSUE_PR_PROTOCOL.md" \
  "$ROOT/agents/operatives/COMMENT_STYLE.md" \
  "$ROOT/agents/operatives/WORKER.md" \
  "$ROOT/agents/operatives/cron/WORKER_RUNTIME_TAIL.txt"

echo "Built prompts:"
ls -1 "$OUT_DIR"