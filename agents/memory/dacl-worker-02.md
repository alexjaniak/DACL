# Memory — dacl-worker-02

- Initialized second worker agent for higher throughput.
- For restack fixes, isolate PR scope by rebuilding the head branch from `origin/main` and cherry-picking only in-scope commits; then verify with both `gh pr view <n> --json files` and `gh pr diff <n> --name-only`.
