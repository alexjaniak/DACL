#!/usr/bin/env bash
set -euo pipefail

# Validates one-file-per-run emission + canonical schema for planner/worker run logs.
# Usage: ./scripts/validate-runlog-emission.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATE_UTC="$(date -u +%F)"
TS_UTC="$(date -u +"%Y-%m-%d %H:%M UTC")"

emit_and_verify() {
  local agent_id="$1"
  local role="$2"
  local run_id="issue-57-${agent_id}-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
  local dir="$REPO_ROOT/agents/runlogs/${agent_id}/${DATE_UTC}"

  mkdir -p "$dir"

  local before after
  before=$(find "$dir" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')

  "$REPO_ROOT/scripts/agent-runlog.sh" \
    --agent-id "$agent_id" \
    --role "$role" \
    --run-id "$run_id" \
    --repo "DACL" \
    --date "$DATE_UTC" \
    --timestamp "$TS_UTC"

  local file="$dir/${run_id}.md"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: expected run-log file not found: $file" >&2
    return 1
  fi

  after=$(find "$dir" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
  if [[ $((after - before)) -ne 1 ]]; then
    echo "ERROR: expected exactly one new file for ${agent_id}; before=${before} after=${after}" >&2
    return 1
  fi

  grep -q '^# Run Log$' "$file"
  grep -q '^## Actions Taken$' "$file"
  grep -q '^## Learning$' "$file"
  grep -q '^## Blockers$' "$file"
  grep -q '^## Next Step$' "$file"

  echo "PASS ${agent_id} (${role}) -> ${file}"
}

emit_and_verify "dacl-planner-01" "planner"
emit_and_verify "dacl-worker-01" "worker"

echo "Validation complete: one-file-per-run emission + canonical template sections verified."
