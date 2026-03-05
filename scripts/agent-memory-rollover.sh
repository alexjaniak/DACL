#!/usr/bin/env bash
set -euo pipefail

# Ensure canonical per-run memory directory exists and perform day-rollover bookkeeping.
# Usage: ./scripts/agent-memory-rollover.sh <agent-id> <directive-file>

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-id> <directive-file>" >&2
  exit 1
fi

AGENT_ID="$1"
DIRECTIVE_FILE="$2"
REPO_ROOT="$(git rev-parse --show-toplevel)"
TODAY="$(date -u +%F)"
NOW_UTC="$(date -u +"%Y-%m-%d %H:%M UTC")"

MEMORY_DIR="${REPO_ROOT}/agents/memory/${AGENT_ID}"
TODAY_DIR="${MEMORY_DIR}/${TODAY}"
STATE_FILE="${MEMORY_DIR}/.rollover-state"

mkdir -p "${MEMORY_DIR}" "${TODAY_DIR}"

if [[ ! -f "${DIRECTIVE_FILE}" ]]; then
  echo "Directive file not found: ${DIRECTIVE_FILE}" >&2
  exit 1
fi

# One-time migration/deprecation of monolithic memory file.
if [[ -f "${LEGACY_FILE}" ]]; then
  if [[ ! -f "${LEGACY_ARCHIVE}" ]]; then
    cp "${LEGACY_FILE}" "${LEGACY_ARCHIVE}"
  fi

  cat > "${LEGACY_FILE}" <<EOF
# Deprecated Memory Path


Use canonical run logs under:
- agents/memory/${AGENT_ID}/<YYYY-MM-DD>/<run-id>.md

Legacy content archived at:

Updated: ${NOW_UTC}
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

PREV_DIR="${MEMORY_DIR}/${LAST_ROLLOVER_DATE}"
if [[ -d "${PREV_DIR}" ]]; then
  SUMMARY_LINES="$(grep -hE '^- ' "${PREV_DIR}"/*.md 2>/dev/null | tail -n 8 || true)"

  if [[ -n "${SUMMARY_LINES}" ]]; then
    {
      echo
      echo "## Rollover summary from ${LAST_ROLLOVER_DATE}"
      echo "${SUMMARY_LINES}"
    } >> "${DIRECTIVE_FILE}"
  fi

  CANDIDATES="$(grep -hEi '^- .*\b(always|never|must|should|avoid|ensure|remember|if)\b' "${PREV_DIR}"/*.md 2>/dev/null | sed 's/^- //' || true)"

  if [[ -n "${CANDIDATES}" ]]; then
    ADDED=0
    while IFS= read -r candidate; do
      [[ -z "${candidate}" ]] && continue
      if ! grep -Fqi "${candidate}" "${DIRECTIVE_FILE}"; then
        if [[ ${ADDED} -eq 0 ]]; then
          {
            echo
            echo "## Distilled lessons from daily memory rollover"
          } >> "${DIRECTIVE_FILE}"
        fi
        echo "- ${candidate}" >> "${DIRECTIVE_FILE}"
        ADDED=1
      fi
    done <<< "${CANDIDATES}"
  fi
fi

echo "${TODAY}" > "${STATE_FILE}"
