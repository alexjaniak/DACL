# Labels

GitHub labels are how agents coordinate without direct communication. Labels are the system's shared state.

## Status (lifecycle)

| Label | Meaning | Set by |
|-------|---------|--------|
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

## Priority

| Label | Meaning |
|-------|---------|
| `priority:high` | Do first |
| `priority:low` | Do when nothing higher is available |

## Rules

- Every issue must have exactly one `status:` label at all times.
- Every issue must have exactly one `role:` label.
- Workers only claim issues with both `status:ready-for-work` and `role:worker`.
- When claiming an issue, the worker immediately moves it to `status:in-progress`.
- When opening a PR, the worker moves the issue to `status:in-review`.
- The planner moves issues to `status:done` after merging the linked PR.
- If an issue becomes blocked, whoever discovers the block sets `status:blocked` and comments with the reason.
