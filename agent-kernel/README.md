# agent-kernel

One-shot Claude CLI wrapper. Cron-friendly.

## Setup

```bash
# 1. Get a long-lived CLI token
claude setup-token

# 2. Create your .env
cp agent-kernel/.env.example agent-kernel/.env
# Paste your token as CLAUDE_CODE_OAUTH_TOKEN in .env
```

## Files

| File | Purpose |
|------|---------|
| `run.sh` | Invokes `claude` CLI once and exits. |
| `.env` | Auth and overrides (gitignored). See `.env.example`. |
| `cron/` | Cron management subsystem. See [`cron/README.md`](cron/README.md). |
| `../contexts/` | Library of reusable context files. See [Context Library](#context-library). |

## Usage

```bash
# Text-only (default — --print, no tools)
./agent-kernel/run.sh "Summarize recent commits"

# With context files (paths relative to repo root)
./agent-kernel/run.sh --context contexts/IDENTITY.md "Summarize recent commits"

# Agentic with context
./agent-kernel/run.sh --agentic --context contexts/IDENTITY.md "Check for stale PRs and comment on them"

# Piped
echo "List open issues" | ./agent-kernel/run.sh
```

## Context Library

Reusable context files live in `contexts/` at the repo root. Each `.md` file is a self-contained context snippet.

```
contexts/
  IDENTITY.md      # agent identity and rules
  CONSTRAINTS.md   # operational constraints
  PLANNER.md       # planner agent instructions
  WORKER.md        # worker agent instructions
  HANDOFF.md       # task handoff protocol
  LABELS.md        # GitHub issue labeling conventions
  WORKSPACE.md     # git worktree and branching guidelines
```

Select which contexts to include per invocation with `--context <path>` (repeatable, relative to repo root).

Cron jobs can also specify contexts in `cron-jobs.json`:
```json
{
  "id": "daily-summary",
  "interval": "1h",
  "prompt": "Summarize recent activity",
  "contexts": ["contexts/IDENTITY.md"]
}
```

## How it works

1. `--context <path>` flags assemble a system prompt from context files (paths relative to repo root)
2. System prompt is passed via `--append-system-prompt` (preserves Claude's built-in capabilities)
3. Your prompt goes as the message argument
4. `--dangerously-skip-permissions` is on by default for unattended runs
5. Default mode is `--print` (text only). Pass `--agentic` to enable tool use.
6. `--workspace <id>` runs inside an isolated git worktree at `.repos/<id>`
