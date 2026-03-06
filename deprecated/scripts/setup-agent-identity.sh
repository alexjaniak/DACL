#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/setup-agent-identity.sh <agent-id> [repo-path]
# Example:
#   ./scripts/setup-agent-identity.sh dacl-agent-001 /path/to/repo

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-id> [repo-path]" >&2
  exit 1
fi

AGENT_ID="$1"
REPO_PATH="${2:-$(pwd)}"
KEY_DIR="${HOME}/.ssh/dacl-agents"
KEY_FILE="${KEY_DIR}/${AGENT_ID}_signing"

mkdir -p "${KEY_DIR}"
chmod 700 "${HOME}/.ssh" "${KEY_DIR}"

if [[ ! -f "${KEY_FILE}" ]]; then
  ssh-keygen -t ed25519 -C "${AGENT_ID} commit signing" -f "${KEY_FILE}" -N "" >/dev/null
fi

chmod 600 "${KEY_FILE}"
chmod 644 "${KEY_FILE}.pub"

if ! git -C "${REPO_PATH}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: ${REPO_PATH} is not a git repository" >&2
  exit 1
fi

# Per-worktree deterministic identity (never mutate shared repo identity).
git -C "${REPO_PATH}" config --worktree dacl.agentId "${AGENT_ID}"
git -C "${REPO_PATH}" config --worktree user.name "${AGENT_ID}"
git -C "${REPO_PATH}" config --worktree user.email "${AGENT_ID}@users.noreply.github.com"
git -C "${REPO_PATH}" config --worktree user.useConfigOnly true
git -C "${REPO_PATH}" config --worktree gpg.format ssh
git -C "${REPO_PATH}" config --worktree commit.gpgsign true
git -C "${REPO_PATH}" config --worktree user.signingkey "${KEY_FILE}.pub"

echo "Configured ${AGENT_ID} in ${REPO_PATH}"
echo "Public signing key: ${KEY_FILE}.pub"
cat "${KEY_FILE}.pub"
