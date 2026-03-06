#!/usr/bin/env bash
set -euo pipefail

# Usage: check-issue-pr-sync.sh <repo> <pr-number>
REPO="${1:?repo required (owner/repo)}"
PR="${2:?pr number required}"

BODY="$(gh pr view "$PR" -R "$REPO" --json body --jq .body)"
ISSUE="$(printf '%s' "$BODY" | sed -n 's/.*[Cc]loses #\([0-9][0-9]*\).*/\1/p' | head -n1)"

if [[ -z "${ISSUE:-}" ]]; then
  echo "OUT_OF_SYNC: PR #$PR has no 'Closes #<issue>' link"
  exit 2
fi

PR_UPDATED="$(gh pr view "$PR" -R "$REPO" --json updatedAt --jq .updatedAt)"
ISSUE_UPDATED="$(gh issue view "$ISSUE" -R "$REPO" --json updatedAt --jq .updatedAt)"

if [[ "$ISSUE_UPDATED" > "$PR_UPDATED" ]]; then
  echo "OUT_OF_SYNC: issue #$ISSUE updated after PR #$PR"
  exit 3
fi

echo "IN_SYNC: PR #$PR linked to issue #$ISSUE"
