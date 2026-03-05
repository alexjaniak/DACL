# ORCHESTRATOR UNSTUCK SWEEP

Agent ID: `@prteamleader`
Cadence: every 5 minutes

## Objective
Continuously remove execution bottlenecks so planner/worker loops keep shipping.

## Unstuck Sweep Checklist
1. **Queue health scan**
   - Inspect open epics/child/fix issues and open PRs.
   - Detect stale items (no meaningful progress, bad labels, bad base branch, missing links).

2. **Dependency unblock pass**
   - Identify blocked issues whose blockers are already resolved.
   - Move labels from `status:blocked` -> `status:ready-for-work` when safe.
   - If still blocked, enforce explicit unblock condition comment.

3. **Label hygiene**
   - Enforce worker intake gate labels:
     - `role:worker`
     - `status:ready-for-work`
   - Normalize malformed/missing labels.

4. **PR topology enforcement**
   - Verify child/fix PR base = parent branch (not `main`).
   - Verify `Closes #<child-issue>` and checklist/evidence are present.

5. **Planner/worker stuck detection**
   - If no code progress and repeated comments: open a precise fix issue or retarget issue ownership.
   - If planner deadlocks issue graph, split/retag tasks into executable slices.

6. **Merge flow acceleration**
   - Prompt planners to merge clean non-parent PRs when ready.
   - If a non-parent PR is already clearly clean and merge-ready, merge immediately to reduce queue time.
   - Never merge/close main parent PR (Alex is final authority).

7. **Conflict churn breaker**
   - If a child PR is conflict-heavy/dirty and repeatedly stalled, close it with a concise rationale.
   - Re-queue its issue as `status:ready-for-work` for a clean restack from latest parent branch.
   - Post exact next action on the issue (new branch base + scope constraints).

8. **Dependency relabel sweep**
   - When blocker issues are merged, immediately relabel downstream blocked issues to `status:ready-for-work`.

9. **Low-noise reporting**
   - Comment only when state changes materially.
   - Keep comments concise and action-focused.

## Success Criteria
- Ready queue remains non-empty when work exists.
- Blocked queue has explicit reasons and owners.
- Child PRs target parent branches correctly.
- Fewer stale cycles and faster issue-to-merge throughput.
