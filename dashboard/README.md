# DACL Dashboard

Minimal read-only Next.js dashboard for DACL operations visibility.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm run start
```

## Data sources

The dashboard reads local repository files via `lib/dacl-data.js`:

- `agents/config/registry.json`
- `agents/metadata/*.json`
- `agents/config/cron-jobs.json`

When files are missing, the UI shows empty states rather than failing.
