#!/usr/bin/env bash
set -euo pipefail

# Read-only identity guard for planner/worker runs.
# Verifies that the active worktree's git identity matches deterministic
# bootstrap config from agents/config/<agent-id>.json.
#
# Usage:
#   ./scripts/check-agent-identity.sh [agent-id]
#
# Behavior:
# - If agent-id is omitted, resolves from git config key dacl.agentId.
# - Exits non-zero on mismatch.
# - Does not mutate git config.

REPO_TOP="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_TOP}" ]]; then
  echo "identity-check: not inside a git worktree" >&2
  exit 2
fi

DEFAULT_AGENT_ID="$(git config --get dacl.agentId 2>/dev/null || true)"
AGENT_ID="${1:-${DEFAULT_AGENT_ID}}"
if [[ -z "${AGENT_ID}" ]]; then
  echo "identity-check: missing agent id (arg1 or git config dacl.agentId)" >&2
  exit 2
fi

CONFIG_FILE="${REPO_TOP}/agents/config/${AGENT_ID}.json"
if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "identity-check: missing config ${CONFIG_FILE}" >&2
  exit 2
fi

python3 - "${REPO_TOP}" "${AGENT_ID}" "${CONFIG_FILE}" <<'PY'
import json
import pathlib
import subprocess
import sys

repo_top = pathlib.Path(sys.argv[1]).resolve()
agent_id = sys.argv[2]
config_file = pathlib.Path(sys.argv[3]).resolve()

cfg = json.loads(config_file.read_text(encoding='utf-8'))
expected_name = cfg.get('git', {}).get('name', agent_id)
expected_email = cfg.get('git', {}).get('email', f'{agent_id}@users.noreply.github.com')
expected_worktree = pathlib.Path(cfg.get('worktreePath', str(repo_top))).resolve()

# Query git (read-only)
def git_get(key: str) -> str:
    p = subprocess.run(['git', 'config', '--get', key], cwd=repo_top, capture_output=True, text=True)
    return p.stdout.strip() if p.returncode == 0 else ''

actual_name = git_get('user.name')
actual_email = git_get('user.email')
actual_agent = git_get('dacl.agentId')

top = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=repo_top, text=True).strip()
actual_worktree = pathlib.Path(top).resolve()

errors = []
if actual_name != expected_name:
    errors.append(f'user.name mismatch: expected={expected_name} actual={actual_name or "<empty>"}')
if actual_email != expected_email:
    errors.append(f'user.email mismatch: expected={expected_email} actual={actual_email or "<empty>"}')
if actual_agent != agent_id:
    errors.append(f'dacl.agentId mismatch: expected={agent_id} actual={actual_agent or "<empty>"}')
if actual_worktree != expected_worktree:
    errors.append(f'worktree mismatch: expected={expected_worktree} actual={actual_worktree}')

if errors:
    for e in errors:
        print(f'identity-check: {e}', file=sys.stderr)
    sys.exit(1)

print(f'identity-check: OK ({agent_id})')
PY
