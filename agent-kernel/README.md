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
| `CONTEXT.md` | System prompt — agent's role, rules, knowledge. Empty = skipped. |
| `run.sh` | Invokes `claude` CLI once and exits. |
| `.env` | Auth and overrides (gitignored). See `.env.example`. |
| `cron/` | Cron management subsystem. See [`cron/README.md`](cron/README.md). |

## Usage

```bash
# Text-only (default — --print, no tools)
./agent-kernel/run.sh "Summarize recent commits"

# Agentic (tools enabled — bash, file edits, etc.)
./agent-kernel/run.sh --agentic "Check for stale PRs and comment on them"

# Piped
echo "List open issues" | ./agent-kernel/run.sh
```

## How it works

1. `CONTEXT.md` content is passed via `--append-system-prompt` (preserves Claude's built-in capabilities)
2. Your prompt goes as the message argument
3. `--dangerously-skip-permissions` is on by default for unattended runs
4. Default mode is `--print` (text only). Pass `--agentic` to enable tool use.
