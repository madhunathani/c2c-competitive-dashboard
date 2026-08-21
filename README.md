# C2C Competitive Intelligence Dashboard

Tracks competitor actions affecting seller acquisition and listing flows across C2C marketplaces (Amazon, Depop, Meta Marketplace, Mercari, Poshmark, Vinted, Whatnot).

## Quick Start

```bash
cd c2c-competitive-dashboard
npm install
npm run dev
```

Open http://localhost:3000. The app runs on mock data from `data/processed/signals.json` by default — no database needed.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Overview | `/` | Summary cards + top signals + eBay action items |
| Signals | `/signals` | Full filterable/sortable signal table |
| Companies | `/companies` | Per-competitor signal summaries |
| Levers | `/levers` | Company × Lever heatmap |

## Ingestion Pipeline (Python)

```bash
# Install dependencies
pip install anthropic requests pyyaml beautifulsoup4

# Set env
export ANTHROPIC_API_KEY=your_key

# Run pipeline
python3 scripts/fetch_sources.py
python3 scripts/extract_signals.py
python3 scripts/map_signals.py
python3 scripts/score_signals.py
python3 scripts/dedupe_signals.py
python3 scripts/write_snapshots.py
```

Each script reads from the previous step's output in `data/processed/`. The final `signals.json` is what the frontend reads.

## Configuration

- `config/sources.yaml` — add/remove source URLs
- `config/vocabularies.yaml` — canonical taxonomy values
- `.env.local` — set `DATABASE_URL`, `ANTHROPIC_API_KEY`, `REFRESH_SECRET`

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel Cron runs a daily refresh at 12:00 UTC via `/api/refresh`. See `vercel.json`.

## Database

`sql/schema.sql` defines the Postgres schema. In mock mode (`DATA_SOURCE=mock`), the frontend reads `data/processed/signals.json` directly. Switch to `DATA_SOURCE=database` and install a Postgres client (`@vercel/postgres`, `neon`, or `supabase-js`) to go fully database-backed.

## Taxonomy

See `docs/dashboard-spec.md` for the full taxonomy, scoring model, and pipeline documentation.
