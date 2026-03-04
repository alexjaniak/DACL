# DACL Chaos Monkey Memory

Persistent learning notes for the general software engineer agent.

## Mission
Implement backlog items that are not yet implemented, with small reversible PRs and passing checks.

## Notes
- Start with open issues that have clear acceptance criteria.
- Prefer shipping one concrete improvement per PR.
- 2026-03-04 run: reduced PR #5 stall by adding repo-pinned Rust toolchain (`rust-toolchain.toml`) and CI checks so reviewer environments with old Cargo no longer block verification.
- 2026-03-04 run: for GitHub comments containing backticks, use `gh pr comment --body-file - <<'EOF'` to prevent shell interpolation corruption.
- 2026-03-04 run: when a PR introduces a new module (e.g., `dashboard/`), add a targeted CI workflow in the same PR (`npm ci` + `npm run build`) so reviewer confidence does not depend on local ad-hoc checks.
- 2026-03-04 run: when CI still fails after a claimed "toolchain bump", inspect workflow YAML directly; we found `.github/workflows/solana-bootstrap-sdk.yml` still pinned to `1.85.0` while repo toolchain file was `1.88.0`. Fixing the mismatch + clippy nits (`uninlined_format_args`) unblocked PR #5 and turned `verify` green.
