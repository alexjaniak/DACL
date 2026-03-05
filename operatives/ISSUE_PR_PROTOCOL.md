# ISSUE/PR PROTOCOL

This file is the canonical operations contract for planners/workers.

## 1) Core model

- Parent issue = broad objective
- Child issue = executable unit
- Fix issue = corrective follow-up tied to a PR/issue

## 2) Label taxonomy + decision matrix

### `type:*` (what it is)
- `type:epic` → parent objective
- `type:task` → planned child execution unit
- `type:fix` → corrective task opened from review findings
- `type:review` → review/meta quality work item

### `role:*` (who owns execution)
- `role:orchestrator` → orchestration/process decisions
- `role:planner` → decomposition/review/spec work
- `role:worker` → implementation work

### `status:*` (where it is in lifecycle)
- `status:ready-for-planning` → parent/new item needs decomposition
- `status:ready-for-work` → scoped and executable by worker
- `status:in-progress` → actively claimed
- `status:needs-review` → implementation done, waiting planner review
- `status:blocked` → cannot progress without dependency/decision
- `status:ready-to-merge` → passed AC/checks and merge-safe

### `priority:*` (urgency)
- `priority:P0` critical now
- `priority:P1` high
- `priority:P2` normal
- `priority:P3` low

### `area:*` (domain)
- `area:frontend`, `area:solana`, `area:ops` (extend as needed)

## 3) Label application rules (hard)

### Parent issue creation
Must include:
- `type:epic`
- `role:planner`
- `status:ready-for-planning`
- one `priority:*`
- one `area:*` (or more if truly cross-cutting)

### Child issue creation (planner)
Must include:
- `type:task`
- `role:worker`
- `status:ready-for-work`
- `priority:*`
- `area:*`

### Fix issue creation (planner)
Must include:
- `type:fix`
- `role:worker`
- `status:ready-for-work`
- link to source PR + source issue

### Worker claim
On claim:
- keep `role:worker`
- change `status:ready-for-work` → `status:in-progress`

### Worker handoff for review
When implementation done:
- change `status:in-progress` → `status:needs-review`

### Planner approval/merge-ready
When AC/checks pass:
- change `status:needs-review` → `status:ready-to-merge`

### Blocked state
Set `status:blocked` only when a specific external dependency/decision is required.
Comment must include unblock condition.

## 4) Worker intake gate (hard)

Workers may only implement issues that have BOTH:
- `status:ready-for-work`
- `role:worker`

If either label is missing: do not implement; request planner classification.

## 5) Required links

- Child issues reference parent issue.
- PR body must include `Closes #<child-issue>`.
- Fix issues must reference both source PR and source issue.

## 6) Branch/PR topology (parent-branch model)

- Each parent issue owns one long-lived branch:
  - `parent/<parent-issue-id>-<slug>`
- Child/fix branches are created from parent branch.
- Child/fix PRs target parent branch as base (NOT `main`).
- Planner merges passing child/fix PRs into parent branch.
- Exactly one final integration PR exists:
  - `parent branch -> main`

## 7) PR formatting contract

Every implementation PR must include:

1. `Closes #<child-issue>`
2. Issue coverage checklist
3. Evidence section (commands/tests/results)
4. Risks/notes (brief)

Recommended body skeleton:

```md
## Linked issue
Closes #<child-issue>

## Issue coverage checklist
- [ ] AC1
- [ ] AC2

## Evidence
- command: ...
- result: ...

## Risks / Notes
- ...
```

## 8) Comment formatting contract

- Every comment starts with `@<agent-id>`
- Must be proper Markdown via `--body-file`
- Never post escaped newline artifacts (e.g. literal `\n`)
- Comment only on meaningful state change (claim, push, blocker, review result, merge-ready)

See: `operatives/COMMENT_STYLE.md`

## 9) Agent memory protocol

- Raw run notes in daily files:
  - `agents/memory/<agent-id>/YYYY-MM-DD.md`
- Read today's file by default; yesterday only when needed.
- On first run of a new UTC day, run rollover:
  - `scripts/agent-memory-rollover.sh <agent-id> agents/directives/<agent-id>.md`

### Memory commit routing (hard)
- Memory/directive updates must always be committed to `main`.
- Never commit memory changes on child issue branches, fix branches, or parent integration branches.
- Use primary repo checkout for memory sync:
  - `cd /home/openclaw/.openclaw/workspace/DACL && ./scripts/memory-sync.sh <agent-id> <path> "<note>"`

## 10) Merge policy

A PR is merge-ready only when:
1) acceptance criteria pass,
2) planner confirms pass,
3) issue/PR links and labels are consistent,
4) checks/CI green (or explicitly waived with reason)

### Final merge authority
- Planner/review agents must NOT merge/close the main parent PR.
- Planner agents SHOULD merge non-parent child/fix PRs when ready.
- Alex is final reviewer/merge authority for parent PR -> main.
