# Deal Radar Frontend

Next.js frontend scaffold for Deal Radar, a cache-first deal intelligence demo for noisy Vietnamese resale posts.

## Purpose

The web UI should prove the engineering pipeline:

- Analyze noisy social-commerce text.
- Show normalized product data.
- Compare asking price against market price.
- Display verdict, discount math, cache source, and freshness.
- Demonstrate exact Redis hits and semantic ChromaDB hits.

This frontend is not a generic marketplace app. V1 excludes auth, checkout, seller chat, and live Facebook scraping.

## Current Location

This folder currently contains the initial Next.js scaffold. Repository plans require final application code to live at:

```txt
deal-radar/apps/web/
```

Use this scaffold as starter material or move/regenerate it into the required final location during implementation.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Geist fonts through `next/font`

## Planned Screens

- `/` - deal feed dashboard with verdict filter, cache badges, freshness, and discount math.
- `/demo` - analyze console with raw post input, sample buttons, pipeline trace, and result panel.
- `/deals/[id]` - deal detail with raw post, normalized JSON, market comparison, cache path, and trace.

## Backend Contract

Expected backend base path:

```txt
/api/v1
```

Expected endpoints:

- `GET /deals`
- `GET /deals/{id}`
- `POST /analyze`
- `GET /metrics/cache`
- `GET /health`

Expected cache states:

- `miss`
- `redis_hit`
- `semantic_hit`

Expected verdicts:

- `HOT_DEAL`
- `OK_DEAL`
- `IGNORE`

## Environment

```env
API_BASE_URL=http://api:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:18000
```

## Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Default local URL:

```txt
http://localhost:3000
```

Docker target from root plan:

```txt
http://localhost:13000
```

## Verification

```bash
npm run lint
npm run build
```

Planned browser checks:

- First analyze returns `miss`.
- Same post returns `redis_hit`.
- Paraphrased post returns `semantic_hit`.
- Feed updates after analyze.
- Metrics panel shows cache savings.

## Notes

- `COMPLETE_PLAN.md` is the source of truth.
- `PLAN.md` in this folder contains the frontend implementation plan.
- Next.js 16 requires `revalidateTag("deals", "max")` instead of the old one-argument form.
