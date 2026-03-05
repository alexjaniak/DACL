# DACL — Darwinian Agentic Coordination Layer

DACL runs a GitHub-first multi-agent workflow with strict Issue/PR discipline.

## Topology (scales to N agents)
- **Orchestrators (optional):** `@dacl-orchestrator-XX`
- **Planners (1..N):** `@dacl-planner-XX`
- **Workers (1..N):** `@dacl-worker-XX`

`XX` is a zero-padded numeric suffix (`01`, `02`, ...). Add/remove agents by updating config + registry (see below); the protocol stays the same.

## Source of truth
- **Role behavior + protocol (canonical):** `operatives/*.md`
- **Prompt composition tails (canonical):**
  - `operatives/cron/PLANNER_RUNTIME_TAIL.txt`
  - `operatives/cron/WORKER_RUNTIME_TAIL.txt`
- **Generated inline runtime prompts:**
  - `operatives/cron/generated/PLANNER_PROMPT.txt`
  - `operatives/cron/generated/WORKER_PROMPT.txt`
- **Cron config source of truth:** `cron/jobs.json`
- **Per-agent runtime config:** `agents/config/*.json`
- **Active agent set:** `agents/registry.json`

## Workflow contract
- All agent communication happens on GitHub comments.
- Every agent comment starts with `@<agent-id>`.
- Workers only pick issues labeled:
  - `status:ready-for-work`
  - `role:worker`
- Child/fix PRs target parent branch (`parent/<issue-id>-<slug>`), not `main`.
- Planners merge ready non-parent PRs.
- Alex is final merge authority for parent PR -> `main`.

## Run logs (stateless runs)
- Subagents do **not** keep long-term memory files.
- Each run writes exactly one run log:
  - `agents/runlogs/<agent-id>/<YYYY-MM-DD>/<run-id>.md`
- Template: `operatives/RUN_LOG_TEMPLATE.md`
- Writer helper: `scripts/agent-runlog.sh`
- Validator: `scripts/validate-runlog-emission.sh`

## Deterministic git identity (per-agent/per-worktree)
- Initialize an agent worktree with `scripts/setup-subagent.sh <agent-id>`.
- This writes per-worktree identity (`dacl.agentId`, `user.name`, `user.email`) and SSH signing config.
- Routine planner/worker runs must not mutate `git config user.*`.
- Optional read-only guard for prompts: `scripts/check-agent-identity.sh`.

## Create or remove agents (repo-driven)
1. Add/update per-agent config in `agents/config/`:
   - `dacl-planner-XX.json`
   - `dacl-worker-XX.json`
   - `dacl-orchestrator-XX.json` (optional)
2. Register/unregister IDs in `agents/registry.json`.
3. Add/update schedules in `cron/jobs.json`.
4. Initialize the agent worktree once: `scripts/setup-subagent.sh <agent-id>`.
5. Apply repo cron config to runtime: `scripts/cron/apply-cron-config.sh`.

## Operatives
- `operatives/ORCHESTRATOR.md`
- `operatives/ORCHESTRATOR_UNSTUCK.md`
- `operatives/PLANNER.md`
- `operatives/WORKER.md`
- `operatives/ISSUE_PR_PROTOCOL.md`
- `operatives/COMMENT_STYLE.md`

## Cron operations (repo-driven)
- Build injected inline prompts:
  - `scripts/build-cron-prompts.sh`
- Apply repo cron config + generated prompts to runtime:
  - `scripts/cron/apply-cron-config.sh`
- Restart enabled configured jobs:
  - `scripts/cron/restart-crons.sh`
- Check runtime cron status:
  - `scripts/cron/cron-status.sh`

## Ops dashboard
Path: `apps/ops-dashboard`

Run locally:
```bash
cd apps/ops-dashboard
npm install
npm run dev
```

## Dependencies
```bash
sudo apt-get update
sudo apt-get install -y git gh python3 openssl cargo rustc
```

## License
MIT
