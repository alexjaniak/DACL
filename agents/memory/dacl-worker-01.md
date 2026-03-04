# Memory — dacl-worker-01

- Initialized worker agent with bite-sized implementation protocol.
- When creating PRs via `gh pr create --body`, avoid unescaped backticks because the shell executes inline commands. Use a body file (`--body-file`) or REST patch to keep evidence blocks intact.
- `gh pr edit` can fail in this repo with a GraphQL `projectCards` deprecation error; patch PR metadata via REST instead (`gh api -X PATCH repos/<owner>/<repo>/pulls/<n>` with a JSON body file).
