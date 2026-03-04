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

if [[ ! -d "${REPO_PATH}/.git" ]]; then
  echo "Error: ${REPO_PATH} is not a git repository" >&2
  exit 1
fi

git -C "${REPO_PATH}" config user.name "${AGENT_ID}"
git -C "${REPO_PATH}" config user.email "${AGENT_ID}@users.noreply.github.com"
git -C "${REPO_PATH}" config gpg.format ssh
git -C "${REPO_PATH}" config commit.gpgsign true
git -C "${REPO_PATH}" config user.signingkey "${KEY_FILE}.pub"

echo "Configured ${AGENT_ID} in ${REPO_PATH}"
echo "Public signing key: ${KEY_FILE}.pub"
cat "${KEY_FILE}.pub"
