#!/usr/bin/env bash
set -euo pipefail

openclaw cron list --all --json | jq -r '.jobs[] | [.id,.name,(.enabled|tostring),(.schedule.kind//""),((.schedule.everyMs//0)|tostring)] | @tsv' | awk 'BEGIN{print "ID\tNAME\tENABLED\tKIND\tEVERY_MS"} {print}'
