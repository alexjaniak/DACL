#!/usr/bin/env bash
set -euo pipefail

# Sync one memory/operative file directly to origin/main with deterministic locking.
# Usage: ./scripts/memory-sync.sh <agent-id> <file-path> [note]

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-id> <file-path> [note]" >&2
  exit 1
fi

AGENT_ID="$1"
TARGET_FILE="$2"
NOTE="${3:-update memory}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"

if [[ ! -f "${TARGET_FILE}" ]]; then
  echo "File not found: ${TARGET_FILE}" >&2
  exit 1
fi

infer_role() {
  local raw="${1#dacl-}"
  echo "${raw%%-*}"
}

role="$(infer_role "${AGENT_ID}")"
lock_scope="memory"
if [[ "${TARGET_FILE}" == *"/operatives/"* || "${TARGET_FILE}" == operatives/* ]]; then
  lock_scope="operative-${role}"
fi

mkdir -p "${GIT_COMMON_DIR}/locks"
LOCK_FILE="${GIT_COMMON_DIR}/locks/${lock_scope}-sync.lock"

exec 9>"${LOCK_FILE}"
acquired=0
for attempt in 1 2 3; do
  if flock -n 9; then
    acquired=1
    break
  fi
  sleep 1
done

if [[ ${acquired} -ne 1 ]]; then
  echo "Lock contention for ${lock_scope} sync (${LOCK_FILE})." >&2
  echo "Another sync is in progress; retry in a few seconds. No partial writes were applied." >&2
  exit 75
fi

git fetch origin main >/dev/null 2>&1 || true
git checkout main >/dev/null 2>&1 || true
git pull --ff-only origin main >/dev/null 2>&1 || true

if git diff --quiet -- "${TARGET_FILE}" && git diff --cached --quiet -- "${TARGET_FILE}"; then
  echo "No changes to sync for ${TARGET_FILE}"
  exit 0
fi

git add -- "${TARGET_FILE}"

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

echo "Synced ${TARGET_FILE} to main"
