# DACL Chaos Monkey Memory

Persistent learning notes for the general software engineer agent.

## Mission
Implement backlog items that are not yet implemented, with small reversible PRs and passing checks.

## Notes
- Start with open issues that have clear acceptance criteria.
- Prefer shipping one concrete improvement per PR.
- 2026-03-04 run: reduced PR #5 stall by adding repo-pinned Rust toolchain (`rust-toolchain.toml`) and CI checks so reviewer environments with old Cargo no longer block verification.
- 2026-03-04 run: for GitHub comments containing backticks, use `gh pr comment --body-file - <<'EOF'` to prevent shell interpolation corruption.
- 2026-03-04 run (21:05 UTC): triaged open PRs #5 and #7 first; both have no unresolved review threads and recent implementation activity. No stalled actionable follow-up remained to code, so no code push made this cycle.
- 2026-03-04 run (21:17 UTC): implemented proactive follow-up on PR #7 to reduce drift risk called out in review notes by adding parser-focused tests for `dashboard/lib/dacl-data.js`, refactoring loaders for injectable root-path testability, and wiring `npm run test` into dashboard CI before build.
