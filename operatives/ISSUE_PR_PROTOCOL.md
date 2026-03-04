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

## Merge condition
A PR is merge-ready only when:
1) acceptance criteria are met,
2) planner confirms pass,
3) linked issues are consistent and closeable.
