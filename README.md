# DACL — Darwinian Agentic Coordination Layer

DACL runs a GitHub-first multi-agent workflow with strict Issue/PR discipline.

## Topology (scales to N agents)
- **Orchestrators (optional):** `@dacl-orchestrator-XX`
- **Planners (1..N):** `@dacl-planner-XX`
- **Workers (1..N):** `@dacl-worker-XX`

`XX` is a zero-padded numeric suffix (`01`, `02`, ...). Add/remove agents by updating config + registry (see below); the protocol stays the same.

## Source of truth
- **Role behavior + protocol:** `operatives/*.md` (**canonical**)  
  This defines what each role does.
- **Cron prompt templates (canonical):**
  - `operatives/cron/PLANNER_PROMPT.txt`
  - `operatives/cron/WORKER_PROMPT.txt`
  - (optional) orchestrator prompt template(s) under `operatives/cron/`
- **Per-agent runtime config:** `agents/config/*.json`  
  Each configured agent gets role-appropriate cron prompt injection from `operatives/cron/*`.
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
- Bootstrap once with `scripts/setup-subagent.sh <agent-id>`.
- Setup writes per-worktree identity (`dacl.agentId`, `user.name`, `user.email`) and SSH signing config.
- Routine planner/worker runs must not mutate `git config user.*`.
- Optional read-only guard for prompts: `scripts/check-agent-identity.sh`.

## Add or remove agents
1. Create/update per-agent file(s) in `agents/config/` using naming convention:
   - `dacl-planner-XX.json`
   - `dacl-worker-XX.json`
   - `dacl-orchestrator-XX.json` (optional)
2. Register/unregister agent IDs in `agents/registry.json`.
3. Ensure role maps to the correct injected cron prompt template from `operatives/cron/`.
4. Commit and deploy/restart scheduler if your environment requires it.

## Operatives
- `operatives/ORCHESTRATOR.md`
- `operatives/ORCHESTRATOR_UNSTUCK.md`
- `operatives/PLANNER.md`
- `operatives/WORKER.md`
- `operatives/ISSUE_PR_PROTOCOL.md`
- `operatives/COMMENT_STYLE.md`

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
