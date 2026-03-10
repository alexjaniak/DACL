#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Validate required env vars
if [ -z "${FORGE_WEBHOOK_SECRET:-}" ]; then
    echo "Error: FORGE_WEBHOOK_SECRET must be set" >&2
    exit 1
fi

cleanup() {
    echo "Shutting down..."
    kill 0 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Start the webhook server
echo "Starting webhook server..."
forge-webhook &
SERVER_PID=$!

# Brief pause to let the server bind
sleep 1

# Start the tunnel
echo "Starting tunnel..."
"$SCRIPT_DIR/tunnel.sh" &
TUNNEL_PID=$!

echo "Server PID: $SERVER_PID | Tunnel PID: $TUNNEL_PID"
echo "Press Ctrl+C to stop both."

wait
