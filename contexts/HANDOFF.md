# Handoff Protocol

When you complete a task, post a structured handoff comment on the GitHub issue. This is the primary mechanism for information to flow back to the planner.

## Format

```
@<agent-id> handoff

**Status:** completed | blocked | partial

**PR:** #<number>

**What was done:**
- <concrete list of changes made>

**Deviations from plan:**
- <anything that differed from the issue's original spec, and why>
- (or: none)

**Concerns:**
- <risks, fragility, things that might break, edge cases not covered>
- (or: none)

**Discoveries:**
- <bugs found elsewhere, architectural issues, unexpected dependencies, useful context for future tasks>
- (or: none)
```

## Rules

- Every completed task gets exactly one handoff comment.
- Be honest. If something is fragile or you cut a corner, say so. The planner needs ground truth, not optimism.
- Keep it concise but complete. Make your handoff scannable.
- Discoveries are the most valuable section. A bug you found but didn't fix, a poorly designed API, a flaky test — these propagate upward and inform future planning.
- If status is `blocked`, explain exactly what's blocking and what you tried.
- If status is `partial`, list what's done and what remains.
