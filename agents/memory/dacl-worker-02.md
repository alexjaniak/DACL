# Memory — dacl-worker-02

- Initialized second worker agent for higher throughput.
- For restack fixes, isolate PR scope by rebuilding the head branch from `origin/main` and cherry-picking only in-scope commits; then verify with both `gh pr view <n> --json files` and `gh pr diff <n> --name-only`.
- For stacked child issues, branch from the dependency PR head and open the new PR against that dependency branch to keep child diff scope isolated.
- In this Next.js 16 setup, `npm run lint` (`next lint`) can fail due CLI behavior; include `npm run build` as equivalent validation evidence until lint wiring is updated.
- If no open issue is both `role:worker` and ready/unclaimed, do not post noise comments; report idle state in cron output and focus on memory/directive maintenance.
- `scripts/memory-sync.sh` assumes a real `.git/` directory; run it from the primary repo checkout (`/workspace/DACL`) rather than a linked worktree path where `.git` is a file.
- In linked worktrees, `gh issue/pr list` may fail with `no git remotes found`; use explicit repo targeting (`-R alexjaniak/DACL`) to query GitHub reliably.
- In linked worktrees where `main` is checked out elsewhere, sync by `git fetch origin --prune` + `git rebase origin/main` on your branch instead of `git checkout main`.
- If `gh issue list -R alexjaniak/DACL --state open` returns empty, treat the run as idle: avoid claim/comment noise and spend the cycle on memory/directive upkeep only.
- This GH CLI build may not support `gh repo view -R`; use `gh repo view <owner/repo>` and `--repo <owner/repo>` for list/view commands that need explicit targeting.
- On idle cycles with no open issues, still run `git fetch origin --prune` + `git rebase origin/main` in the worker worktree first so the branch is conflict-minimized before the next assignment.
- 2026-03-04: Cron run found zero OPEN issues in `alexjaniak/DACL`; completed fetch/rebase in worker worktree and skipped GitHub claim/comment noise.
- 2026-03-04 23:38 UTC cron cycle: `gh issue list -R alexjaniak/DACL --state open` returned `[]`; rebased worker branch onto `origin/main` successfully and stayed idle without posting claim/comment noise.
- 2026-03-04 23:41 UTC cron cycle: again found zero open issues via `gh issue list -R alexjaniak/DACL --state open`; completed `git fetch --prune` + `git rebase origin/main` in worker worktree and made no GitHub comments to avoid noise.
- 2026-03-04 23:44 UTC cron cycle: `gh issue list -R alexjaniak/DACL --state open --json ...` returned empty; rebased worker branch onto `origin/main` and stayed silent on GitHub to avoid idle-noise comments.
- 2026-03-04 23:46 UTC cron cycle: confirmed no open issues (`gh issue list -R alexjaniak/DACL --state open` => `[]`); synced worker worktree with `git fetch origin --prune` + `git rebase origin/main` and intentionally made no GitHub comments.
- 2026-03-04 23:48 UTC cron cycle: no open issues found (`gh issue list -R alexjaniak/DACL --state open --json ...` returned `[]`); rebased current worker branch onto `origin/main` and skipped claim/comment activity to avoid noise.
