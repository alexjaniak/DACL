# agent-kernel/cron

Declarative cron management for agent-kernel. Python 3, no dependencies.

## Quick start

```bash
# 1. Define jobs in cron-jobs.json
# 2. Sync crontab
./agent-kernel/cron/manage.py apply
```

## cron-jobs.json

Source of truth for desired cron state. Checked into git.

```json
{
  "jobs": [
    {
      "id": "worker",
      "interval": "5m",
      "prompt": "Check for stale PRs",
      "agentic": true,
      "enabled": true
    }
  ]
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Unique job identifier. |
| `interval` | string | required | `Nm` (minutes) or `Nh` (hours). |
| `prompt` | string | required | Prompt passed to `run.sh`. |
| `agentic` | bool | `false` | Enable tool use (`--agentic`). |
| `enabled` | bool | `true` | Set `false` to remove from crontab without deleting config. |

## Commands

```bash
# Declarative — sync crontab to match cron-jobs.json
./agent-kernel/cron/manage.py apply

# Imperative — one-off add/remove
./agent-kernel/cron/manage.py add <id> <interval> "<prompt>" [--agentic]
./agent-kernel/cron/manage.py remove <id>

# Inspect
./agent-kernel/cron/manage.py list

# Wipe all agent-kernel cron jobs
./agent-kernel/cron/manage.py clear
```

## State tracking

`cron-state.json` is auto-generated and gitignored. It tracks what's actually installed in crontab so `list` works without parsing `crontab -l`.

If the state file gets deleted or out of sync, just run `apply` — it reconverges.

## Logs

Each job logs to `agent-kernel/logs/<id>.log` (persistent across reboots, gitignored). View with:

```bash
# Show last 50 lines for a specific job
./agent-kernel/cron/manage.py logs <id>

# Follow live output
./agent-kernel/cron/manage.py logs <id> -f

# Show last N lines
./agent-kernel/cron/manage.py logs <id> -n 100
```

### Pretty log viewer

A color-coded log viewer is available at `agent-kernel/logs/view.sh`:

```bash
# Tail all agents interleaved
./agent-kernel/logs/view.sh

# Tail a specific agent
./agent-kernel/logs/view.sh worker-01

# Live follow mode
./agent-kernel/logs/view.sh -f
./agent-kernel/logs/view.sh worker-01 -f
```

Each agent gets a distinct color for easy scanning.
