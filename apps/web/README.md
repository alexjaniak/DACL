# Forge Web Dashboard

NextJS app for the Forge agent orchestration dashboard.

## Setup

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Stack

- **Next.js 15** — App Router, TypeScript
- **Tailwind CSS v4** — Utility-first styling
- **shadcn/ui** — Component library
- **One Dark** — Color theme

## Theme

The dashboard uses a One Dark color palette. Custom CSS variables are defined in `src/app/globals.css` and exposed to Tailwind via `--color-od-*` utilities (e.g., `bg-od-surface`, `text-od-accent-blue`).
