#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CFG="$ROOT/cron/jobs.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

if [[ ! -f "$CFG" ]]; then
  echo "Missing cron config: $CFG" >&2
  exit 1
fi

# Build injected prompts first
"$ROOT/scripts/build-cron-prompts.sh" >/dev/null

current_json="$(openclaw cron list --all --json)"

job_count="$(jq '.jobs | length' "$CFG")"
for i in $(seq 0 $((job_count-1))); do
  id="$(jq -r ".jobs[$i].id" "$CFG")"
  name="$(jq -r ".jobs[$i].name" "$CFG")"
  every="$(jq -r ".jobs[$i].every" "$CFG")"
  enabled="$(jq -r ".jobs[$i].enabled" "$CFG")"
  prompt_rel="$(jq -r ".jobs[$i].promptFile" "$CFG")"
  prompt_path="$ROOT/$prompt_rel"

  if [[ ! -f "$prompt_path" ]]; then
    echo "Missing prompt file: $prompt_rel" >&2
    exit 1
  fi

  msg="$(cat "$prompt_path")"

  exists="$(echo "$current_json" | jq -r --arg id "$id" '[.jobs[] | select(.id==$id)] | length')"

  if [[ "$exists" == "0" ]]; then
    echo "Adding cron: $name"
    out="$(openclaw cron add --name "$name" --every "$every" --message "$msg" --json)"
    new_id="$(echo "$out" | jq -r '.job.id // .id // empty')"
    if [[ -n "$new_id" ]]; then
      echo "Created id: $new_id (update cron/jobs.json to pin)"
    fi
    if [[ "$enabled" == "false" ]]; then
      openclaw cron edit "$new_id" --disable >/dev/null || true
    fi
  else
    echo "Updating cron: $name ($id)"
    openclaw cron edit "$id" --name "$name" --every "$every" --message "$msg" >/dev/null
    if [[ "$enabled" == "true" ]]; then
      openclaw cron edit "$id" --enable >/dev/null
    else
      openclaw cron edit "$id" --disable >/dev/null
    fi
  fi
 done

echo "Cron config applied from $CFG"
