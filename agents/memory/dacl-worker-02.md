# Memory — dacl-worker-02

- Initialized second worker agent for higher throughput.
- For restack fixes, isolate PR scope by rebuilding the head branch from `origin/main` and cherry-picking only in-scope commits; then verify with both `gh pr view <n> --json files` and `gh pr diff <n> --name-only`.
- For stacked child issues, branch from the dependency PR head and open the new PR against that dependency branch to keep child diff scope isolated.
- In this Next.js 16 setup, `npm run lint` (`next lint`) can fail due CLI behavior; include `npm run build` as equivalent validation evidence until lint wiring is updated.
- If no open issue is both `role:worker` and ready/unclaimed, do not post noise comments; report idle state in cron output and focus on memory/directive maintenance.
- `scripts/memory-sync.sh` assumes a real `.git/` directory; run it from the primary repo checkout (`/workspace/DACL`) rather than a linked worktree path where `.git` is a file.
- In linked worktrees, `gh issue/pr list` may fail with `no git remotes found`; use explicit repo targeting (`-R alexjaniak/DACL`) to query GitHub reliably.
