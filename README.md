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

## Daily Agent Memory Workflow

- Canonical run-log template source: `operatives/RUN_LOG_TEMPLATE.md`.
- Canonical path/write helper: `scripts/agent-runlog.sh` creates or resolves:
  - `agents/memory/<agent-id>/<YYYY-MM-DD>/<run-id>.md`
- Runtime write policy: each planner/worker run should emit one log file under `agents/memory/<agent-id>/<YYYY-MM-DD>/<run-id>.md`.
- Runtime proof helper: `scripts/validate-runlog-emission.sh` validates one planner + one worker run each emit exactly one new run-log file and include canonical sections.
- Runtime read policy: load today's run folder by default; consult yesterday's folder only when needed.
- On first run of a new UTC day, run:
  - `scripts/agent-memory-rollover.sh <agent-id> agents/directives/<agent-id>.md`
- Rollover script responsibilities:
  - ensure today's run folder exists (`agents/memory/<agent-id>/<YYYY-MM-DD>/`)
  - detect day rollover with a local state marker
  - summarize the previous day into the first run log for today
  - promote novel durable lessons into the agent directive
  - preserve legacy daily files as read-only inputs for migration (never as runtime write targets)

### Migration notes (legacy files -> per-run)

If an agent still has historical legacy files such as `agents/memory/<agent-id>.md` or `agents/memory/<agent-id>/YYYY-MM-DD.md`:

1. Keep legacy files for history; do not append new run notes there.
2. Start writing all new logs to `agents/memory/<agent-id>/<YYYY-MM-DD>/<run-id>.md` via `scripts/agent-runlog.sh`.
3. During first UTC run, execute rollover to initialize the date folder/state and directive promotions.
4. Use canonical sections from `operatives/RUN_LOG_TEMPLATE.md` in every new run log so parsing stays uniform across roles.

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

## Ops Dashboard (`apps/ops-dashboard`)

### Local run

```bash
cd apps/ops-dashboard
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Where data mapping lives

- `apps/ops-dashboard/lib/data.js` reads and normalizes:
  - `agents/registry.json` + per-agent config files
  - `apps/ops-dashboard/data/cron-jobs.json`
  - `apps/ops-dashboard/data/activity.json`
- `apps/ops-dashboard/app/page.js` renders Agents, Cron Jobs, and Activity cards from that normalized shape.
- `apps/ops-dashboard/app/api/dashboard/route.js` exposes the same data as JSON.

### How to extend cards/sections

1. Add/adjust source fields in `lib/data.js` (keep defaults human-readable).
2. Update the matching section renderer in `app/page.js`.
3. Add any minimal style tweaks in `app/globals.css`.
4. If needed externally, mirror new fields in `app/api/dashboard/route.js`.

---

## License

MIT
