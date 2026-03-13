# DACL

Autonomous agent orchestration. Planner and worker agents run in isolated git worktrees, coordinating via GitHub issues.

## Repo structure

```
agent-kernel/    One-shot Claude CLI wrapper, cron-friendly
contexts/        Reusable context library for agent instructions
```

- **[agent-kernel](agent-kernel/README.md)** — invoke Claude CLI with context files, run unattended via cron
- **[contexts](contexts/)** — modular `.md` files that shape agent behavior (identity, constraints, planner/worker roles, handoff protocol, labels, workspace rules)

## How it works

Agents are stateless one-shot CLI invocations. Each run:

1. `agent-kernel/run.sh` assembles a system prompt from selected context files
2. Invokes `claude` CLI in either text-only (`--print`) or agentic mode
3. Optionally runs inside an isolated git worktree (`--workspace`)

Cron jobs drive recurring agent runs. See [`agent-kernel/cron/README.md`](agent-kernel/cron/README.md).

## Forge CLI

Unified command-line interface for agent orchestration.

```
forge add worker              # add a new worker agent
forge add planner             # add a new planner agent
forge remove <id>             # remove an agent
forge cron apply              # sync crontab
forge cron status --watch     # live agent timing
forge logs -f                 # follow all logs
forge wh                      # start webhook monitor
```

Install: `pip install -e apps/forge-cli`

## Getting started

```bash
git clone https://github.com/alexjaniak/DACL.git
cd DACL
./install.sh
```

The install script checks prerequisites, installs dependencies, and generates config files.

### Manual setup

If you prefer manual setup:
1. `pip install -e apps/forge-cli` — Install the Forge CLI
2. `pip install -e apps/webhook-monitor` — Install the webhook server
3. `cd apps/web && npm install` — Install dashboard dependencies
4. `cp agent-kernel/.env.example agent-kernel/.env` — Configure credentials
5. `cp apps/webhook-monitor/config.example.toml apps/webhook-monitor/config.toml` — Configure webhooks
