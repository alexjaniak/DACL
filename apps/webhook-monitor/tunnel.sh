#!/usr/bin/env bash
set -euo pipefail

PORT="${FORGE_WEBHOOK_PORT:-8471}"

# Try gh webhook forward first (built into GitHub CLI)
if command -v gh &>/dev/null && gh webhook forward --help &>/dev/null; then
    echo "Using gh webhook forward → localhost:$PORT"
    exec gh webhook forward \
        --repo="${FORGE_WEBHOOK_REPO:?Set FORGE_WEBHOOK_REPO (owner/repo)}" \
        --events="issues,pull_request,issue_comment,pull_request_review" \
        --url="http://localhost:$PORT/webhook" \
        --secret="${FORGE_WEBHOOK_SECRET:?Set FORGE_WEBHOOK_SECRET}"
fi

# Fall back to ngrok
if command -v ngrok &>/dev/null; then
    echo "Using ngrok → localhost:$PORT"
    echo "Configure your GitHub webhook with the URL printed below + /webhook"
    exec ngrok http "$PORT"
fi

echo "Error: No tunnel tool found." >&2
echo "Install one of:" >&2
echo "  gh extension install cli/gh-webhook" >&2
echo "  brew install ngrok" >&2
exit 1
