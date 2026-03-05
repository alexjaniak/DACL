#!/usr/bin/env bash
set -euo pipefail

# Ensure daily memory file exists and perform day-rollover consolidation.
# Usage: ./scripts/agent-memory-rollover.sh <agent-id> [context-file]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-id> [context-file]" >&2
  exit 1
fi

AGENT_ID="$1"
CONTEXT_FILE="${2:-}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"
TODAY="$(date -u +%F)"
NOW_UTC="$(date -u +"%Y-%m-%d %H:%M UTC")"

MEMORY_DIR="${REPO_ROOT}/agents/memory/${AGENT_ID}"
TODAY_FILE="${MEMORY_DIR}/${TODAY}.md"
STATE_FILE="${MEMORY_DIR}/.rollover-state"

mkdir -p "${MEMORY_DIR}"

if [[ -n "${CONTEXT_FILE}" && ! -f "${CONTEXT_FILE}" ]]; then
  echo "[rollover] Context file not found (continuing): ${CONTEXT_FILE}" >&2
fi

infer_role() {
  local raw="${1#dacl-}"
  echo "${raw%%-*}"
}

canonical_operative_path() {
  local role="$1"
  echo "${REPO_ROOT}/operatives/$(echo "${role}" | tr '[:lower:]' '[:upper:]').md"
}

promote_to_shared_operative() {
  local agent_id="$1"
  local source_file="$2"
  local role
  role="$(infer_role "${agent_id}")"

  local operative_file
  operative_file="$(canonical_operative_path "${role}")"

  if [[ ! -f "${operative_file}" ]]; then
    echo "[rollover] Shared operative target missing for role '${role}': ${operative_file}" >&2
    return 0
  fi

  local candidates
  candidates="$(grep -Ei '^- .*(always|never|must|should|avoid|ensure|remember|if)\b' "${source_file}" | sed 's/^- //' || true)"
  if [[ -z "${candidates}" ]]; then
    echo "[rollover] No durable lesson candidates to promote for role '${role}'."
    return 0
  fi

  mkdir -p "${GIT_COMMON_DIR}/locks"
  local lock_file="${GIT_COMMON_DIR}/locks/operative-${role}.lock"

  exec 8>"${lock_file}"
  if ! flock -n 8; then
    echo "[rollover] Lock contention on role '${role}' operative (${lock_file})." >&2
    echo "[rollover] Another same-role promotion is active. Retry in a few seconds. No files were modified." >&2
    return 75
  fi

  local section="## Distilled role learnings"
  if ! grep -Fq "${section}" "${operative_file}"; then
    {
      echo
      echo "${section}"
      echo
    } >> "${operative_file}"
  fi

  local added=0
  while IFS= read -r candidate; do
    [[ -z "${candidate}" ]] && continue
    if ! grep -Fqi "${candidate}" "${operative_file}"; then
      printf -- "- %s\n" "${candidate}" >> "${operative_file}"
      added=1
    fi
  done <<< "${candidates}"

  if [[ ${added} -eq 1 ]]; then
    echo "[rollover] Promoted durable lessons to ${operative_file} (role=${role})."
  else
    echo "[rollover] Durable lessons already present in ${operative_file} (role=${role})."
  fi
}

if [[ ! -f "${TODAY_FILE}" ]]; then
    {
      echo "# Memory — ${AGENT_ID} (${TODAY})"
      echo
      echo "_Migrated from legacy file on ${NOW_UTC}._"
      echo
      cat "${LEGACY_FILE}"
      echo
    } > "${TODAY_FILE}"
  fi
  cat > "${LEGACY_FILE}" <<EOF
# Deprecated Memory Path


Use daily memory files under:
- agents/memory/${AGENT_ID}/YYYY-MM-DD.md

Legacy content archived at:
EOF
fi

if [[ ! -f "${TODAY_FILE}" ]]; then
  cat > "${TODAY_FILE}" <<EOF
# Memory — ${AGENT_ID} (${TODAY})

- Initialized daily memory file.
EOF
fi

LAST_ROLLOVER_DATE=""
if [[ -f "${STATE_FILE}" ]]; then
  LAST_ROLLOVER_DATE="$(cat "${STATE_FILE}" | tr -d '[:space:]')"
fi

# First run for this agent/day model.
if [[ -z "${LAST_ROLLOVER_DATE}" ]]; then
  echo "${TODAY}" > "${STATE_FILE}"
  exit 0
fi

if [[ "${LAST_ROLLOVER_DATE}" == "${TODAY}" ]]; then
  exit 0
fi

PREV_FILE="${MEMORY_DIR}/${LAST_ROLLOVER_DATE}.md"
if [[ -f "${PREV_FILE}" ]]; then
  SUMMARY_LINES="$(grep -E '^- ' "${PREV_FILE}" | tail -n 8 || true)"

  {
    echo
    echo "## Rollover summary from ${LAST_ROLLOVER_DATE}"
    if [[ -n "${SUMMARY_LINES}" ]]; then
      echo "${SUMMARY_LINES}"
    else
      echo "- No bullet learnings captured in previous day file."
    fi
  } >> "${TODAY_FILE}"

  promote_rc=0
  set +e
  promote_to_shared_operative "${AGENT_ID}" "${PREV_FILE}"
  promote_rc=$?
  set -e

  if [[ ${promote_rc} -eq 75 ]]; then
    echo "[rollover] Exiting due to lock contention after safe no-op. Retry this command shortly." >&2
    exit 75
  fi
fi

echo "${TODAY}" > "${STATE_FILE}"
