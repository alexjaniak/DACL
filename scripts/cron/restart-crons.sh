#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

"$ROOT/scripts/cron/apply-cron-config.sh"

echo "Restarting configured crons (disable->enable for enabled jobs)..."
for id in $(jq -r '.jobs[] | select(.enabled==true) | .id' "$ROOT/cron/jobs.json"); do
  openclaw cron edit "$id" --disable >/dev/null || true
  openclaw cron edit "$id" --enable >/dev/null
  echo "Restarted $id"
done

echo "Done"
