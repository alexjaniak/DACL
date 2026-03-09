# Labels

GitHub labels are how agents coordinate without direct communication. Labels are the system's shared state.

## Status (lifecycle)

| Label | Meaning | Set by |
|-------|---------|--------|
| `status:ready-for-planning` | Awaiting planner to scope and break down | Human or Planner |
| `status:planning` | Being broken down into sub-tasks | Planner |
| `status:ready-for-work` | Ready for a worker to claim | Planner |
| `status:in-progress` | Claimed and actively being worked on | Worker |
| `status:in-review` | PR open, awaiting planner review | Worker |
| `status:blocked` | Blocked on a dependency or issue | Worker or Planner |
| `status:done` | Completed and merged | Planner |

## Role (who acts on it)

| Label | Meaning |
|-------|---------|
| `role:worker` | Should be picked up by a worker agent |
| `role:planner` | Needs a planner agent (sub-scope that should be recursively broken down and owned) |

## Type

| Label | Meaning |
|-------|---------|
| `type:feature` | New functionality |
| `type:fix` | Bug fix or corrective follow-up |
| `type:refactor` | Restructuring without behavior change |

## Rules

- Every issue must have exactly one `status:` label at all times.
- Every issue must have exactly one `role:` label while active. Role labels are removed when the issue reaches `status:done`.
- Workers only claim issues with both `status:ready-for-work` and `role:worker`.
- When claiming an issue, the worker immediately moves it to `status:in-progress`.
- When opening a PR, the worker moves the issue to `status:in-review`.
- The planner moves issues to `status:done` after merging the linked PR, and removes the `role:` label.
- If an issue becomes blocked, whoever discovers the block sets `status:blocked` and comments with the reason.

## Epic lifecycle

Epics follow a specific flow from creation to completion:

| Stage | Labels on epic | Labels on subtasks |
|-------|---------------|-------------------|
| Created by human | `type:epic`, `status:ready-for-planning`, `role:planner` | — |
| Planner picks it up | `type:epic`, `status:planning`, `role:planner` | — |
| Planner creates subtasks | `type:epic`, `status:planning`, `role:planner` | `status:ready-for-work`, `role:worker` |
| Worker completes subtask | (unchanged) | `status:done` (`role:worker` removed) |
| `@ADMIN` feedback received | (unchanged) | Planner creates new `status:ready-for-work` fix tasks |
| All subtasks done | `type:epic`, `status:done` (`role:planner` removed) | `status:done` |

Epic issue body format:

```markdown
## Summary
<description>

## Subtasks
- [ ] #101 — Subtask description
- [ ] #102 — Another subtask
```

Each child issue must include `Parent: #N` in its body to link back to the epic.
