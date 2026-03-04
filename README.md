# DACL — Darwinian Agentic Coordination Layer

DACL coordinates AI agents through a strict GitHub Issue/PR workflow.

This repo now prioritizes **execution discipline** over complexity:
- all planning and implementation routed through GitHub Issues + PRs
- clear agent roles
- active behavior (not passive status chatter)

---

## Communication Contract (Hard Rule)

All agent communication happens on GitHub (issues/PR comments).

- Every agent comment must start with: `@<agent-id>`
- No side-channel status logs required for execution
- Comments must be high-signal only (state changes, commits pushed, blockers, ready-to-merge)

Example:
`@dacl-worker-01 implemented AC #2 in commit abc1234; tests passing; ready for planner review.`

---

## Agent Topology (v1)

### 1) Orchestrator (`@prteamleader`)
Purpose:
- define broad feature goals as parent issues
- enforce process and acceptance quality
- spawn/assign planner work

Output:
- one parent issue with clear scope + success definition

### 2) Planner (`@dacl-planner-01`)
Purpose:
- decompose parent goals into bite-sized issues
- maintain dependency graph
- review worker PRs against issue spec
- open follow-up fix issues when implementation diverges

Output:
- precise child issues with acceptance criteria
- review decisions (pass/fix needed)

### 3) Worker (`@dacl-worker-01`)
Purpose:
- implement bite-sized issues only
- no broad re-planning, no architecture drift
- execute quickly and continuously when actionable issues exist

Output:
- focused PRs that close child issues

---

## v1 Operating Model (Current)

For now, run:
- **1 Planner**
- **1 Worker**

Behavior requirements:
- planner and worker should be actively conversational with each other on GitHub
- worker should implement whenever a ready issue exists
- planner should continuously scope/review and open fix issues when needed

Goal state:
- parent issue represented by a merge-ready PR (or set of PRs) with all child issues closed

---

## Robust GitHub Issue/PR System

## Issue Types

### Parent Issue (Epic)
Contains:
- business/feature goal
- boundaries (in/out of scope)
- success criteria
- child issue checklist

### Child Issue (Execution Unit)
Must include:
- objective
- exact acceptance criteria
- constraints/non-goals
- test/validation expectations
- dependency refs (`blocked by #...` / `depends on #...`)

### Fix Issue
Opened by planner when PR review fails spec.
Must be minimal and directly linked to offending PR.

---

## PR Requirements (Mandatory)

Every PR must include:
- `Closes #<child-issue-id>`
- issue coverage checklist
- evidence section (tests/checks/commands)
- concise risk notes

PR lifecycle:
1. worker opens PR
2. planner reviews against acceptance criteria
3. if failing: planner opens fix issue and links it
4. worker implements fix issue
5. planner re-reviews
6. merge + auto-close issues

---

## Agent Comment Rules

Agents should comment when:
- claiming work
- pushing meaningful implementation commits
- changing blocker status
- marking ready-for-review / ready-to-merge

Agents should not comment when:
- no new code
- no new evidence
- no state change

All comments begin with `@<agent-id>`.

---

## Operatives (Playbooks)

See:
- `operatives/ORCHESTRATOR.md`
- `operatives/PLANNER.md`
- `operatives/WORKER.md`
- `operatives/ISSUE_PR_PROTOCOL.md`

These are the execution rules for each role.

---

## Dependencies

Baseline tools:
- `git`
- `gh`
- `python3`
- `openssl`
- `cargo`
- `rustc`

Install on Debian/Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y git gh python3 openssl cargo rustc
```

---

## Roadmap (Process-First)

1. Stabilize planner/worker protocol
2. Add Next.js visibility dashboard (agents + jobs + issue/PR state)
3. Add Solana devnet bootstrap (Anchor-aligned)
4. Expand to multi-planner/multi-worker swarms

---

## License

MIT
