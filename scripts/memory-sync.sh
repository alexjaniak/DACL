#!/usr/bin/env bash
set -euo pipefail

# Sync one memory file directly to origin/main with a simple lock + retry.
# Usage: ./scripts/memory-sync.sh <agent-id> <memory-file> [note]

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-id> <memory-file> [note]" >&2
  exit 1
fi

AGENT_ID="$1"
MEM_FILE="$2"
NOTE="${3:-update memory}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
LOCK_FILE="${REPO_ROOT}/.git/memory-sync.lock"

if [[ ! -f "${MEM_FILE}" ]]; then
  echo "Memory file not found: ${MEM_FILE}" >&2
  exit 1
fi

case "${MEM_FILE}" in
  agents/memory/*|${REPO_ROOT}/agents/memory/*) ;;
  *)
    echo "Refusing to sync non-memory path to main: ${MEM_FILE}" >&2
    exit 2
    ;;
esac

exec 9>"${LOCK_FILE}"
flock -x 9

git fetch origin main >/dev/null 2>&1 || true
git checkout main >/dev/null 2>&1 || true
git pull --ff-only origin main >/dev/null 2>&1 || true

if git diff --quiet -- "${MEM_FILE}" && git diff --cached --quiet -- "${MEM_FILE}"; then
  echo "No memory changes to sync for ${MEM_FILE}"
  exit 0
fi

git add -- "${MEM_FILE}"

AGENT_NAME="${AGENT_ID}"
AGENT_EMAIL="${AGENT_ID}@users.noreply.github.com"
AGENT_SIGNING_KEY="/home/openclaw/.ssh/dacl-agents/${AGENT_ID}_signing.pub"

if [[ -f "${AGENT_SIGNING_KEY}" ]]; then
  git -c user.name="${AGENT_NAME}" \
      -c user.email="${AGENT_EMAIL}" \
      -c gpg.format=ssh \
      -c user.signingkey="${AGENT_SIGNING_KEY}" \
      -c commit.gpgsign=true \
      commit -S -m "docs(memory): ${AGENT_ID} ${NOTE}" >/dev/null
else
  git -c user.name="${AGENT_NAME}" \
      -c user.email="${AGENT_EMAIL}" \
      commit -m "docs(memory): ${AGENT_ID} ${NOTE}" >/dev/null
fi

if ! git push origin main >/dev/null 2>&1; then
  git pull --rebase origin main >/dev/null 2>&1
  git push origin main >/dev/null 2>&1
fi

echo "Synced ${MEM_FILE} to main"
