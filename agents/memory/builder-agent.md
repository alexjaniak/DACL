# Builder Agent Memory

Persistent lessons for implementation flow, issue triage, and PR execution quality.

- (init) Prioritize one PR per issue, avoid duplicate branches/PRs, and integrate reviewer feedback into follow-up commits.
- 2026-03-04: Repo alexjaniak/DACL had one open issue (#1), but an open PR already references it (PR #3). Correct behavior is silent skip with no new PR/comment; continue scanning other candidates/repos.

- 2026-03-04: Builder loop run at 19:16 UTC scanned alexjaniak/DACL issue #1; open PR #3 already linked via body search (#1), so skipped silently per policy. No additional actionable unassigned issues found.
- 2026-03-04: Builder loop run at 19:21 UTC re-validated alexjaniak/DACL issue #1 is already covered by open PR #3 (`agent/dacl-builder-1-subagent-wallet-flow`); skipped with no duplicate PR/comment. Branch hygiene note: builder worktree currently has uncommitted changes on the linked branch (`scripts/setup-subagent.sh`, `agents/metadata/`), so future loops should avoid cross-issue work until that branch is cleaned/merged.

- 2026-03-04 19:26 UTC: Builder loop found no open issues in alexjaniak/DACL (`gh issue list` returned empty). Blocker: none. Branch hygiene: builder worktree remains dirty on `agent/dacl-builder-1-subagent-wallet-flow` (modified `scripts/setup-subagent.sh`, untracked `agents/metadata/`), so avoid starting new issue branches from that worktree until cleaned.
- 2026-03-04 19:32 UTC: Builder loop re-ran target scan; `alexjaniak/DACL` still has no open issues (empty `gh issue list`). No claim comments, branches, PRs, or issue updates created. Branch hygiene unchanged: builder worktree is still dirty on `agent/dacl-builder-1-subagent-wallet-flow`; keep future runs read-only until this branch is cleaned or merged.
- 2026-03-04 19:37 UTC: Builder loop scanned targets from `agents/config/review-targets.txt`; `alexjaniak/DACL` returned no open issues via `gh issue list --state open`. Result: no PR creation/follow-up work, no comments posted, duplicate-skip logic not triggered.
