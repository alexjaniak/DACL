# ops-dashboard

Operations dashboard built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui**.

## Stack notes

- **TypeScript** is enabled via `tsconfig.json` and `next-env.d.ts`.
- **Tailwind CSS v4** is configured through `app/globals.css` using `@import "tailwindcss"` and CSS theme tokens.
- **shadcn/ui** is configured with `components.json`; card primitives are in `components/ui/card.tsx`.
- UI data sources are file-backed JSON fixtures under `data/` and loaded by `lib/data.ts`.

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

## Validation checklist

- Dashboard renders the three key card groups: **Agents**, **Cron Jobs**, **Activity**.
- Layout is responsive across mobile/tablet/desktop widths.
- Data views remain functional (no schema changes required for existing JSON fixtures).
- Build passes: `npm --prefix apps/ops-dashboard run build`.
