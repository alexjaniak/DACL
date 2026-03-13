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
forge locks list              # show active locks
forge locks clear             # clear stale locks
forge wh                      # start webhook monitor
```

Install: `pip install -e apps/forge-cli`

## Lock system

Agents coordinate via file-based locks to prevent multiple agents from claiming the same GitHub issue simultaneously.

### How it works

1. **Preflight**: When `run.sh` starts a worker or planner, it queries GitHub for eligible issues and attempts to acquire a lock on one before invoking the agent.
2. **Atomic acquisition**: Locks use `mkdir` (atomic on POSIX) to create a lock directory. If the directory already exists, the issue is taken.
3. **Stale detection**: Each lock records the holding process's PID. If the PID is dead, the lock is automatically removed and re-acquired.
4. **Pre-assignment**: The locked issue number is exported as `FORGE_LOCKED_ISSUE` and injected into the agent's system prompt as `ASSIGNED_ISSUE: <N>`.
5. **Cleanup**: On exit, `run.sh` releases the lock via a trap handler.

### Lock directory layout

```
.repos/github.com/<owner>/<repo>/locks/
├── issues/
│   └── 123.lock/        # directory (mkdir = atomic)
│       └── info.json    # {"agent": "worker-01", "pid": 12345, "claimed_at": "..."}
└── prs/
    └── 456.lock/
        └── info.json
```

### Environment variables

| Variable | Set by | Purpose |
|----------|--------|---------|
| `FORGE_LOCKED_ISSUE` | `run.sh` preflight | Exported to the agent process; holds the locked issue number |
| `WORK_REPO_DIR` | `run.sh` | Required by lock functions; points to the repo directory under `.repos/` |

### CLI: `forge locks`

Inspect and manage locks from the command line.

```
forge locks list              # show all held locks (repo, type, number, agent, pid, age, status)
forge locks clear             # remove only stale locks (dead PIDs)
forge locks clear --all       # remove all locks (prompts for confirmation)
forge locks clear --all --force  # remove all locks without confirmation
```

### Shell library: `agent-kernel/locks.sh`

Source this file to use lock functions in scripts:

```bash
source agent-kernel/locks.sh

lock_acquire issue 123 worker-01   # acquire (returns 0 on success, 1 if locked)
lock_release issue 123             # release (idempotent)
lock_check   issue 123             # check status (0=locked, 1=free)
lock_list    "$WORK_REPO_DIR"      # list all held locks
lock_clear_stale "$WORK_REPO_DIR"  # remove stale locks
lock_clear_all   "$WORK_REPO_DIR"  # force-remove all locks
```

Requires `WORK_REPO_DIR` to be set.

## Getting started

See [agent-kernel/README.md](agent-kernel/README.md) for setup and usage.
