#!/usr/bin/env bash
set -euo pipefail

# Ensure daily memory file exists and perform day-rollover consolidation.
# Usage: ./scripts/agent-memory-rollover.sh <agent-id> <directive-file>

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-id> <directive-file>" >&2
  exit 1
fi

AGENT_ID="$1"
DIRECTIVE_FILE="$2"
REPO_ROOT="$(git rev-parse --show-toplevel)"
TODAY="$(date -u +%F)"
MEMORY_DIR="${REPO_ROOT}/agents/memory/${AGENT_ID}"
TODAY_FILE="${MEMORY_DIR}/${TODAY}.md"
STATE_FILE="${MEMORY_DIR}/.rollover-state"

mkdir -p "${MEMORY_DIR}"

if [[ ! -f "${DIRECTIVE_FILE}" ]]; then
  echo "Directive file not found: ${DIRECTIVE_FILE}" >&2
  exit 1
fi

# Daily-memory-first behavior: create today's file if missing.
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

  CANDIDATES="$(grep -Ei '^- .*\b(always|never|must|should|avoid|ensure|remember|if)\b' "${PREV_FILE}" | sed 's/^- //' || true)"

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
