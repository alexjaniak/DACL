#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo "Shutting down..."
    kill 0 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Start webhook server
echo "Starting webhook server..."
forge-webhook &
SERVER_PID=$!

# Give the server a moment to bind
sleep 1

# Start tunnel
echo "Starting tunnel..."
"$SCRIPT_DIR/tunnel.sh" &
TUNNEL_PID=$!

echo "Server PID: $SERVER_PID | Tunnel PID: $TUNNEL_PID"
echo "Press Ctrl+C to stop both."

wait
