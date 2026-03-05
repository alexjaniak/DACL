# ISSUE/PR PROTOCOL

This file is the canonical operations contract for planners/workers.

## 1) Core model

- Parent issue = broad objective
- Child issue = executable unit
- Fix issue = corrective follow-up tied to a PR/issue

## 2) Label taxonomy + decision matrix

## Agent memory protocol
- Canonical per-run log template source: `operatives/RUN_LOG_TEMPLATE.md`.
- Canonical path/write helper: `scripts/agent-runlog.sh` targeting `agents/memory/<agent-id>/<YYYY-MM-DD>/<run-id>.md`.
- Agents must write new runtime memory only to per-run files; legacy daily files (`agents/memory/<agent-id>/YYYY-MM-DD.md`) are read-only migration inputs.
- Agents should read today's run-log folder by default and consult yesterday's folder only when needed for continuity.
- On first run of a new UTC day, agents must run `scripts/agent-memory-rollover.sh <agent-id> agents/directives/<agent-id>.md` before normal issue/PR work.
- Every new run log must preserve canonical headings/fields from `operatives/RUN_LOG_TEMPLATE.md` for machine parsing consistency across roles.

A PR is merge-ready only when:
1) acceptance criteria pass,
2) planner confirms pass,
3) issue/PR links and labels are consistent,
4) checks/CI green (or explicitly waived with reason)

### Final merge authority
- Planner/review agents must NOT merge/close the main parent PR.
- Planner agents SHOULD merge non-parent child/fix PRs when ready.
- Alex is final reviewer/merge authority for parent PR -> main.

### Post-merge issue synchronization (mandatory)
After merging a child/fix PR, planner must in the same cycle:
- verify linked issue closure status,
- if still open: add merge note + update labels + close issue,
- update parent tracking checklist/status.

### Parent finalization protocol (mandatory)
For each parent PR, planner must converge to this end-state:
1) all linked child/fix issues closed,
2) parent checklist fully updated,
3) parent PR clean with checks green,
4) one final `@dacl-planner-* ready-to-merge` summary comment.
After this, no further planner churn on that parent PR (wait for Alex merge decision).
