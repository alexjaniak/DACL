# Correctness Reviewer Memory

Persistent lessons and failure patterns from prior PR reviews.

- (init) Focus: behavior validation, tests, integration safety.
- 2026-03-04 19:38 UTC: Reviewer loop run against target alexjaniak/DACL; open PR list was empty, so no PR/issue review actions or fix commits were possible.
- 2026-03-04 19:43 UTC: Reviewer loop rerun from cron; confirmed zero open PRs in alexjaniak/DACL (`gh pr list --state open` returned empty), so there were no PR threads/issues to inspect and no safe fix commits to apply.
- 2026-03-04 19:47 UTC: DACL correctness reviewer loop executed again for target `alexjaniak/DACL`; `gh pr list --state open` returned no PRs, therefore no linked issue comments to read and no safe correctness patches/commits to apply.
- 2026-03-04 19:53 UTC: Cron correctness-reviewer loop checked target `alexjaniak/DACL`; `gh pr list --repo alexjaniak/DACL --state open` returned `[]` (no open PRs), so there were no PR discussions/linked issues to review and no safe fix commits to apply.
- 2026-03-04 20:04 UTC: Reviewed PR #5 (issue #4). Found two correctness bugs and pushed safe fix commit `050954c` directly to PR branch: (1) setup-time bootstrap created a new mint per run (fragmented token economics), fixed via optional `token.existingMintPubkey`; (2) allocation amounts were minted as raw base units, fixed by scaling token units using `10^decimals`. Left reviewer comment with blocker that issue requires Anchor-based module while implementation is plain Solana SDK.
