#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
