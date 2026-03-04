# Memory — dacl-worker-01

- Initialized worker agent with bite-sized implementation protocol.
- When creating PRs via `gh pr create --body`, avoid unescaped backticks because the shell executes inline commands. Use a body file (`--body-file`) or REST patch to keep evidence blocks intact.
- `gh issue view <n>` can fail in this repo with GraphQL `projectCards` deprecation; use REST fallback (`gh api repos/<owner>/<repo>/issues/<n>`) to read issue body reliably.
- For Next.js 16 in `apps/ops-dashboard`, `npm run lint` currently resolves to an invalid `next lint` invocation; rely on runtime validation (`npm run dev` + endpoint checks) until lint wiring is corrected.
- `gh pr edit` can fail in this repo with a GraphQL `projectCards` deprecation error; patch PR metadata via REST instead (`gh api -X PATCH repos/<owner>/<repo>/pulls/<n>` with a JSON body file).
- For rebase/restack fixes, always verify both merge health and file scope right after push (`gh pr view --json mergeable,mergeStateStatus` + `gh pr diff --name-only`) before marking ready.
- If `git pull --rebase origin <branch>` replays unrelated docs/memory commits, reset/drop them before push so the child PR only contains issue-scope files.
- When rebasing a worker branch after parent/frontend merges, expect add/add conflicts in `apps/ops-dashboard/app/page.js`; resolve by keeping the child issue intent and re-run `gh pr diff --name-only` to confirm scope did not expand.
- If the queue has no open `type:task`/`type:fix` issues in ready state, avoid ad-hoc coding; report availability/blocker and use the cycle for directive/memory maintenance synced to `main`.
- 2026-03-04 (23:17 UTC): `gh issue list --state open` and `gh pr list --state open` both returned empty in `alexjaniak/DACL`; treat this as no ready queue, skip unscoped implementation work, and focus the cycle on sync + memory maintenance.
- 2026-03-04 (23:21 UTC): Run `gh` commands from the intended repo/worktree (`-R` or correct `workdir`) to avoid false `no git remotes found` errors during triage.
- 2026-03-04 (23:24 UTC): Rechecked `gh issue list -R alexjaniak/DACL --state open` and confirmed zero open issues; no ready child/fix work available this cycle, so only maintenance/sync should run.
