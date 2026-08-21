# C2C Competitive Intelligence Dashboard — Specification

## Purpose

Track competitor and company actions that affect seller acquisition and listing flows in C2C marketplaces. Surface high-priority signals weekly for the Growth and Seller Experience teams.

## Taxonomy

### Journey Stages
| Stage | Description |
|-------|-------------|
| `acquisition` | Attracting new sellers to register and list |
| `listing` | Converting registered sellers into active listers |
| `sale` | Post-listing actions that improve sell-through |
| `engagement_retention` | Keeping active sellers engaged and re-listing |
| `multi_stage` | Signal spans multiple stages |

### Levers
15 levers covering the full seller journey: promotions, marketing, onboarding, seller_trust, draft_reentry, resell_entry_point, fees_monetization, listing_tools, ai_assistant, search_visibility, price_guidance, shipping_fulfillment, bx_nudges, seller_protections, balance_wallet.

### Seller Segments
prospect, new_seller, reactivated_seller, churned_seller, occasional_seller, regular_seller, nora, norl, nors, multi_segment.

## Scoring Model

Each signal is scored on five dimensions (1–10), weighted into a composite:

| Dimension | Weight | Meaning |
|-----------|--------|---------|
| Relevance | 30% | How directly does this affect eBay's seller funnel? |
| Magnitude | 25% | How large is the potential impact at scale? |
| Novelty | 20% | How new or unexpected for this company? |
| Confidence | 15% | How certain are we this signal is accurate? |
| Recency | 10% | How recently was this published? |

**Priority thresholds:**
- High: composite ≥ 8.0
- Medium: composite ≥ 6.5
- Low: composite < 6.5

## Ingestion Pipeline

```
fetch_sources.py      → data/raw/<company>/<slug>_<date>.json
extract_signals.py    → data/processed/candidates_<date>.json
map_signals.py        → data/processed/mapped_<date>.json
score_signals.py      → data/processed/scored_<date>.json
dedupe_signals.py     → data/processed/deduped_<date>.json
write_snapshots.py    → data/processed/signals.json
```

Run daily. On Vercel, trigger via the `/api/refresh` cron route or GitHub Actions.

## Pages

### Overview (`/`)
- 6 summary stat cards
- Top 8 signals by composite score
- eBay action items panel (high-priority implications)

### Signals (`/signals`)
- Full filterable/sortable table
- Filters: company, journey stage, lever, priority, seller segment, full-text search
- Click any row to expand description + score breakdown + eBay implications

### Companies (`/companies`)
- Company pill filter
- Per-company card: signal count, priority breakdown, stage distribution, top levers, recent signals

### Levers (`/levers`)
- Stage filter (Acquisition / Listing / Sale / Engagement & Retention)
- Company × Lever heatmap — hover a cell to see its signals
- Lever ranking bar chart with high-priority callouts

## Data Mode

`DATA_SOURCE=mock` in `.env.local` reads from `data/processed/signals.json` directly (no database required). Set `DATA_SOURCE=database` and provide `DATABASE_URL` to read from Postgres.

## Competitors Tracked

Amazon, Depop, Meta Marketplace, Mercari, Poshmark, Vinted, Whatnot.

## Deployment

Hosted on Vercel. Daily refresh via Vercel Cron at 12:00 UTC → `/api/refresh`. Database: Vercel Postgres, Neon, or Supabase.
