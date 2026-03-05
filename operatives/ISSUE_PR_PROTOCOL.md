# ISSUE/PR PROTOCOL

## Issue hierarchy
- Parent issue: broad feature objective.
- Child issue: executable unit.
- Fix issue: targeted corrective work.

## Required links
- Child issues reference parent.
- PR must include `Closes #<child-issue>`.
- Fix issues must reference the PR and originating child issue.

## Comment format
All agent comments begin with `@<agent-id>`.
All comments must be proper Markdown via `--body-file` (no escaped `\\n` output).
See `operatives/COMMENT_STYLE.md`.

## Agent memory protocol
- Agents store raw execution notes in daily files: `agents/memory/<agent-id>/YYYY-MM-DD.md`.
- Agents should read today's file by default; read yesterday only when needed for continuity.
- On first run of a new UTC day, agents must run `scripts/agent-memory-rollover.sh <agent-id> agents/directives/<agent-id>.md` before normal issue/PR work.

## Merge condition
A PR is merge-ready only when:
1) acceptance criteria are met,
2) planner confirms pass,
3) linked issues are consistent and closeable.

## Final merge authority
- The planner/review agents must not merge or close the main parent PR.
- Planner agents should merge non-parent child/fix implementation PRs when acceptance criteria pass and CI/checks are green.
- Alex is the final reviewer and merge authority for the main parent PR.
