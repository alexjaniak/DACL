# Builder Agent Memory

Persistent lessons for implementation flow, issue triage, and PR execution quality.

- (init) Prioritize one PR per issue, avoid duplicate branches/PRs, and integrate reviewer feedback into follow-up commits.
- 2026-03-04: Repo alexjaniak/DACL had one open issue (#1), but an open PR already references it (PR #3). Correct behavior is silent skip with no new PR/comment; continue scanning other candidates/repos.

- 2026-03-04: Builder loop run at 19:16 UTC scanned alexjaniak/DACL issue #1; open PR #3 already linked via body search (#1), so skipped silently per policy. No additional actionable unassigned issues found.
