# ops-dashboard

Operations dashboard built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui**.

## Live data architecture

`lib/data.ts` hydrates all primary panels from repo-backed sources:

- **Agents** → derived from `agent-kernel/cron/cron-jobs.json` entries (role inferred from `contexts` array)
- **Cron Jobs** → `agent-kernel/cron/cron-jobs.json`
- **Runlog History** → not yet available (graceful empty state); target schema: `agents/runlogs/<agent-id>/<YYYY-MM-DD>/*.md`
- **Activity** → derived from each agent's latest parsed runlog entry (empty until runlogs exist)

There is no separate agent registry — agents are defined by their cron job entries.

## UX resilience

- Route-level loading and error boundaries (`app/loading.tsx`, `app/error.tsx`)
- Empty/error panel states for each section
- Auto-refresh every 15s via `router.refresh()` to surface runtime/repo changes
- `dynamic = 'force-dynamic'` to avoid stale cached responses

## Local development

From repo root:

```bash
npm --prefix apps/ops-dashboard install
npm --prefix apps/ops-dashboard run dev
```

Then open: `http://localhost:3000`

## Build and run

```bash
npm --prefix apps/ops-dashboard run build
npm --prefix apps/ops-dashboard run start
```
