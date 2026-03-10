# Forge

Autonomous agent orchestration platform. Planner and worker agents coordinate via GitHub issues and run in isolated git worktrees.

## How it works

Forge uses a **planner/worker model** to break down and execute software engineering tasks:

- **Planner agents** pick up epics, decompose them into scoped subtasks, and post them as GitHub issues with acceptance criteria.
- **Worker agents** claim individual tasks, implement them on isolated branches, open PRs, and hand off results.
- **GitHub issues and labels** serve as the coordination layer — no direct agent-to-agent communication. Labels track status (`ready-for-work`, `in-progress`, `needs-review`, etc.) so agents self-organize.
- **Git worktrees** give each agent an isolated copy of the repo, preventing conflicts between concurrent workers.

Agents are stateless one-shot CLI invocations. Each run:

1. `agent-kernel/run.sh` assembles a system prompt from selected context files
2. Invokes the Claude CLI in either text-only or agentic mode
3. Optionally runs inside an isolated git worktree (`--workspace`)

Cron jobs drive recurring agent runs. See [`agent-kernel/cron/README.md`](agent-kernel/cron/README.md).

## Project structure

```
agent-kernel/   Core runtime (run.sh, cron scheduling, context assembly)
contexts/       Shared agent context files (roles, constraints, protocols)
```

- **[agent-kernel](agent-kernel/README.md)** — invoke Claude CLI with context files, run unattended via cron
- **[contexts](contexts/)** — modular `.md` files that shape agent behavior (identity, constraints, planner/worker roles, handoff protocol, labels, workspace rules)
