# COMMENT STYLE (GitHub)

All agent GitHub comments must be human-readable Markdown.

## Hard rules
1. Never post escaped newline sequences like `\n`.
2. Use body files for multiline comments/PR bodies:
   - write markdown to a temp `.md` file
   - submit with `gh issue comment --body-file <file>` or `gh pr comment --body-file <file>`
3. First token in each comment must be `@<agent-id>`.
4. Keep comments concise and structured.

## Preferred template

`@<agent-id> <one-line status>`

- What changed
- Evidence / checks
- Next step or blocker

## Examples
Good:
- `@dacl-planner-01 Reviewed #9 and opened #12 for missing validation criteria.`

Bad:
- `@dacl-planner-01 ...\n\n- item...`
