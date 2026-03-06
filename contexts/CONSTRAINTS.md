# Constraints

Shared constraints for all agents. Constraints define boundaries — they are more effective than instructions.

## GitHub protocol

- All agent communication happens on GitHub (issue/PR comments). No other channels.
- Use `gh` CLI for all GitHub operations. Use `--body-file` for multiline content. Never use escaped `\n` sequences.
- Be concise. Lead with status, then details. No filler.

## gh operations

```bash
# List issues by label
gh issue list --label "status:ready-for-work" --label "role:worker" --json number,title,labels

# Read an issue and its comments
gh issue view <number> --comments

# Create an issue with labels
gh issue create --title "<title>" --body-file <file> --label "status:ready-for-work" --label "role:worker"

# Comment on an issue
gh issue comment <number> --body-file <file>

# Change labels (remove old status, add new)
gh issue edit <number> --remove-label "status:ready-for-work" --add-label "status:in-progress"

# Create a PR targeting a specific branch
gh pr create --base <target-branch> --title "<title>" --body-file <file>

# Read a PR and its comments
gh pr view <number> --comments

# Comment on a PR
gh pr comment <number> --body-file <file>

# Merge a PR
gh pr merge <number> --merge

# Close an issue
gh issue close <number>
```

## Code quality

- No TODOs in committed code. Either implement it or create an issue.
- No partial implementations. No stubs, no placeholder functions, no "will fix later."
- No dead code. Don't comment out code "for reference." Delete it; git has history.
- No unnecessary dependencies. If you can implement it in under 50 lines, do it yourself.

## Scope discipline

- Don't fix things outside your task scope. Note them in your handoff and move on.
- Don't refactor code you didn't need to change.
- Don't add error handling for scenarios that can't happen in your context.
- Don't add features, configurability, or abstractions beyond what was asked.

## Git

- Don't modify `git config user.*` during runs. Identity is set up once externally.
- Don't force-push, reset, or rewrite history on shared branches.
- One logical change per commit. Don't bundle unrelated changes.

## Error tolerance

- Accept that other agents may introduce temporary breakage. Don't go outside your scope to fix it.
- If your task is blocked by another agent's broken code, note it in your handoff and stop.
- Trust that the system will converge. Small, temporary errors are acceptable. Cascading "fix" attempts are not.

## Anti-patterns

- Don't retry the same failing approach. If it didn't work twice, rethink.
- Don't sleep or wait on other agents. Do your work and hand off.
- Don't claim premature completion. "It compiles" is not "acceptance criteria met."
