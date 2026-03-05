# Public Cron Manifest

This file mirrors active automation loops for transparency.

## DACL Planner 01 Loop
- schedule: every 120000 ms (2 min)
- enabled: true
- role: planner
- message: see cron payload in gateway; runs parent finalization, non-parent merges, and unstuck actions if blocked; writes one run log file per run.

## DACL Planner 02 Loop
- schedule: every 120000 ms (2 min)
- enabled: true
- role: planner
- message: same as planner-01 with `@dacl-planner-02` identity.

## DACL Worker 01 Loop
- schedule: every 60000 ms (1 min)
- enabled: true
- role: worker
- message: only picks `status:ready-for-work` + `role:worker` issues, implements, opens/updates parent-branch PRs, writes one run log file per run.

## DACL Worker 02 Loop
- schedule: every 60000 ms (1 min)
- enabled: true
- role: worker
- message: same as worker-01 with `@dacl-worker-02` identity.

## DACL Orchestrator Unstuck Sweep
- schedule: every 300000 ms (5 min)
- enabled: true
- role: orchestrator
- message: scans epics/issues/PRs, unblocks stale work, enforces topology/labels.

## Notes
- Delivery mode for all loops: `none` (silent in chat).
- Source of truth is runtime cron config; this file is a public mirror.
