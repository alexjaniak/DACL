# ISSUE/PR PROTOCOL

This file is the canonical operations contract for planners/workers.

## Core model
- Parent issue = broad objective
- Child issue = executable unit
- Fix issue = corrective follow-up tied to a PR/issue

## Agent runlog protocol
- Canonical template: `agents/operatives/RUN_LOG_TEMPLATE.md`
- Canonical helper: `scripts/agent-runlog.sh`
- Canonical path: `agents/runlogs/<agent-id>/<YYYY-MM-DD>/<run-id>.md`
- Agents write exactly one new runlog file per run.
- No persistent subagent memory files are used at runtime.

## Merge readiness
A PR is merge-ready only when:
1) acceptance criteria pass,
2) planner confirms pass,
3) issue/PR links and labels are consistent,
4) checks/CI green (or explicitly waived with reason)

## Final merge authority
- Planner/review agents must NOT merge/close the main parent PR.
- Planner agents SHOULD merge non-parent child/fix PRs when ready.
- Alex is final reviewer/merge authority for parent PR -> main.

## Post-merge issue synchronization (mandatory)
After merging a child/fix PR, planner must in the same cycle:
- verify linked issue closure status,
- if still open: add merge note + update labels + close issue,
- update parent tracking checklist/status.

## Parent finalization protocol (mandatory)
For each parent PR, planner must converge to this end-state:
1) all linked child/fix issues closed,
2) parent checklist fully updated,
3) parent PR clean with checks green,
4) one final `@dacl-planner-* ready-to-merge` summary comment.
After this, no further planner churn on that parent PR (wait for Alex merge decision).
