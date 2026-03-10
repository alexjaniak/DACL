#!/usr/bin/env bash
set -euo pipefail

PORT="${FORGE_WEBHOOK_PORT:-8471}"

# Prefer gh webhook forward (built into GitHub CLI)
if command -v gh &>/dev/null && gh extension list 2>/dev/null | grep -q "webhook"; then
    echo "Using gh webhook forward → localhost:$PORT"
    exec gh webhook forward --repo="$FORGE_REPO" --events="issues,pull_request,issue_comment,pull_request_review" --url="http://localhost:$PORT/webhook" --secret="$FORGE_WEBHOOK_SECRET"
fi

if command -v gh &>/dev/null && gh webhook forward --help &>/dev/null 2>&1; then
    echo "Using gh webhook forward → localhost:$PORT"
    exec gh webhook forward --repo="$FORGE_REPO" --events="issues,pull_request,issue_comment,pull_request_review" --url="http://localhost:$PORT/webhook" --secret="$FORGE_WEBHOOK_SECRET"
fi

# Fall back to ngrok
if command -v ngrok &>/dev/null; then
    echo "Using ngrok → localhost:$PORT"
    echo "Once running, configure the public URL in your GitHub repo webhook settings."
    exec ngrok http "$PORT"
fi

echo "Error: No tunnel tool found." >&2
echo "Install one of:" >&2
echo "  - GitHub CLI webhook extension: gh extension install cli/gh-webhook" >&2
echo "  - ngrok: https://ngrok.com/download" >&2
exit 1
