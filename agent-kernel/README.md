# agent-kernel

One-shot Claude CLI wrapper. Cron-friendly.

## Files

| File | Purpose |
|------|---------|
| `CONTEXT.md` | System prompt — agent's role, rules, knowledge. Empty = skipped. |
| `run.sh` | Invokes `claude` CLI once and exits. |
| `cron-add.sh` | Add a cron job to the system crontab. |
| `cron-remove.sh` | Remove a cron job by ID. |

## Usage

```bash
# Text-only (default — --print, no tools)
./agent-kernel/run.sh "Summarize recent commits"

# Agentic (tools enabled — bash, file edits, etc.)
./agent-kernel/run.sh --agentic "Check for stale PRs and comment on them"

# Piped
echo "List open issues" | ./agent-kernel/run.sh
```

## Cron management

```bash
# Add a job (runs every 5 min with tools enabled)
./agent-kernel/cron-add.sh pr-checker 5m "Check for stale PRs" --agentic

# Add a text-only job (every hour)
./agent-kernel/cron-add.sh daily-summary 1h "Summarize today's activity"

# Remove a job
./agent-kernel/cron-remove.sh pr-checker

# See active jobs
crontab -l | grep "DACL:agent-kernel"
```

Intervals: `Nm` (minutes), `Nh` (hours). Logs go to `/tmp/agent-kernel-<id>.log`.

## How it works

1. `CONTEXT.md` content is passed via `--append-system-prompt` (preserves Claude's built-in capabilities)
2. Your prompt goes as the message argument
3. `--dangerously-skip-permissions` is on by default for unattended runs
4. Default mode is `--print` (text only). Pass `--agentic` to enable tool use.
