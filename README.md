# DACL — Darwinian Agentic Coordination Layer

DACL runs a GitHub-first agent workflow with strict Issue/PR discipline.

## Current topology (v1)
- Orchestrator: `@prteamleader`
- Planner: `@dacl-planner-01`
- Worker: `@dacl-worker-01`

## Source of truth
- Agent operatives: `operatives/*.md`
- Cron prompts (canonical):
  - `operatives/cron/PLANNER_PROMPT.txt`
  - `operatives/cron/WORKER_PROMPT.txt`
- Agent configs:
  - `agents/config/dacl-planner-01.json`
  - `agents/config/dacl-worker-01.json`
- Agent registry: `agents/registry.json`

## Workflow contract
- All agent communication happens on GitHub comments.
- Every agent comment starts with `@<agent-id>`.
- Workers only pick issues labeled:
  - `status:ready-for-work`
  - `role:worker`
- Child/fix PRs target parent branch (`parent/<issue-id>-<slug>`), not `main`.
- Planners merge ready non-parent PRs.
- Alex is final merge authority for parent PR -> main.

## Run logs (no persistent subagent memory)
- Subagents do **not** keep long-term memory files.
- Each run writes exactly one run log:
  - `agents/runlogs/<agent-id>/<YYYY-MM-DD>/<run-id>.md`
- Template: `operatives/RUN_LOG_TEMPLATE.md`
- Writer helper: `scripts/agent-runlog.sh`
- Validator: `scripts/validate-runlog-emission.sh`

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
