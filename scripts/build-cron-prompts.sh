#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/operatives/cron/generated"
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
  "$ROOT/operatives/ISSUE_PR_PROTOCOL.md" \
  "$ROOT/operatives/COMMENT_STYLE.md" \
  "$ROOT/operatives/PLANNER.md" \
  "$ROOT/operatives/ORCHESTRATOR_UNSTUCK.md" \
  "$ROOT/operatives/cron/PLANNER_RUNTIME_TAIL.txt"

assemble "$OUT_DIR/WORKER_PROMPT.txt" \
  "$ROOT/operatives/ISSUE_PR_PROTOCOL.md" \
  "$ROOT/operatives/COMMENT_STYLE.md" \
  "$ROOT/operatives/WORKER.md" \
  "$ROOT/operatives/cron/WORKER_RUNTIME_TAIL.txt"

assemble "$OUT_DIR/ORCHESTRATOR_PROMPT.txt" \
  "$ROOT/operatives/ISSUE_PR_PROTOCOL.md" \
  "$ROOT/operatives/COMMENT_STYLE.md" \
  "$ROOT/operatives/ORCHESTRATOR.md" \
  "$ROOT/operatives/ORCHESTRATOR_UNSTUCK.md" \
  "$ROOT/operatives/cron/ORCHESTRATOR_RUNTIME_TAIL.txt"

echo "Built prompts:"
ls -1 "$OUT_DIR"