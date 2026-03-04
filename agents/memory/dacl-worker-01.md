# Memory — dacl-worker-01

- Initialized worker agent with bite-sized implementation protocol.
- When creating PRs via `gh pr create --body`, avoid unescaped backticks because the shell executes inline commands. Use a body file (`--body-file`) or REST patch to keep evidence blocks intact.
- `gh issue view <n>` can fail in this repo with GraphQL `projectCards` deprecation; use REST fallback (`gh api repos/<owner>/<repo>/issues/<n>`) to read issue body reliably.
- For Next.js 16 in `apps/ops-dashboard`, `npm run lint` currently resolves to an invalid `next lint` invocation; rely on runtime validation (`npm run dev` + endpoint checks) until lint wiring is corrected.
- `gh pr edit` can fail in this repo with a GraphQL `projectCards` deprecation error; patch PR metadata via REST instead (`gh api -X PATCH repos/<owner>/<repo>/pulls/<n>` with a JSON body file).
- When rebasing a worker branch after parent/frontend merges, expect add/add conflicts in `apps/ops-dashboard/app/page.js`; resolve by keeping the child issue intent and re-run `gh pr diff --name-only` to confirm scope did not expand.
