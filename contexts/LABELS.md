# Labels

GitHub labels are how agents coordinate without direct communication. Labels are the system's shared state.

## Status (lifecycle)

| Label | Meaning | Set by |
|-------|---------|--------|
| `status:ready-for-planning` | Awaiting planner to scope and break down | Human or Planner |
| `status:planning` | Being broken down into sub-tasks | Planner |
| `status:ready-for-work` | Ready for a worker to claim | Planner |
| `status:in-progress` | Claimed and actively being worked on | Worker |
| `status:needs-review` | PR open, awaiting review | Worker |
| `status:blocked` | Blocked on a dependency or issue | Worker or Planner |
| `status:done` | Completed and merged | Planner or Super |

## Role (who acts on it)

| Label | Meaning |
|-------|---------|
| `role:worker` | Should be picked up by a worker agent |
| `role:planner` | Needs a planner agent (sub-scope that should be recursively broken down and owned) |
| `role:super` | Needs super agent review (epic PRs ready for final quality gate before admin) |
| `role:admin` | Requires human admin action (infrastructure changes, access grants, decisions agents can't make) |

## Type

| Label | Meaning |
|-------|---------|
| `type:epic` | Multi-task parent issue |
| `type:task` | Standard work item |
| `type:fix` | Bug fix or corrective follow-up |


## Rules

- Every issue must have exactly one `status:` label at all times.
- Every issue must have exactly one `role:` label at all times: `role:worker`, `role:planner`, `role:super`, or `role:admin`.
- Workers only claim issues with both `status:ready-for-work` and `role:worker`.
- When claiming an issue, the worker immediately moves it to `status:in-progress`.
- When opening a PR, the worker moves the issue to `status:needs-review` and sets `role:planner`.
- The planner reviews and merges child PRs (targeting feature branches) and moves subtask issues to `status:done`.
- When all subtasks are done, the planner sets the epic issue to `status:needs-review` + `role:super` for final review.
- The super agent reviews epic PRs and either approves (sets `role:admin` + `status:done`) or rejects (sets `role:planner` + `status:in-progress`).
- If changes are needed, the planner creates a `type:fix` issue labeled `role:worker` + `status:ready-for-work` and moves the original issue back to `status:in-progress`.
- If an issue becomes blocked, whoever discovers the block sets `status:blocked` and comments with the reason.

## Epic lifecycle

Epics follow a specific flow from creation to completion:

| Stage | Labels on epic | Labels on subtasks |
|-------|---------------|-------------------|
| Created by human | `type:epic`, `status:ready-for-planning`, `role:planner` | — |
| Planner picks it up | `type:epic`, `status:planning`, `role:planner` | — |
| Planner creates subtasks | `type:epic`, `status:planning`, `role:planner` | `status:ready-for-work`, `role:worker` |
| Worker completes subtask | (unchanged) | `status:done` |
| All subtasks done | `type:epic`, `status:needs-review`, `role:super` | `status:done` |
| Super approves | `type:epic`, `status:done`, `role:admin` | `status:done` |
| Super rejects | `type:epic`, `status:in-progress`, `role:planner` | Planner creates fix tasks |
| Admin rejects | `type:epic`, `status:needs-review`, `role:super` | Super re-reviews with `@ADMIN` feedback |
| Admin merges to main | `type:epic`, `status:done`, `role:admin` | `status:done` |

Epic issue body format:

```markdown
## Summary
<description>

## Subtasks
- [ ] #101 — Subtask description
- [ ] #102 — Another subtask
```

Each child issue must include `Parent: #N` in its body to link back to the epic.
