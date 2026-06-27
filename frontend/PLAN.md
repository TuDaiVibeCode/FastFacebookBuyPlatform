# Deal Radar Web Frontend Plan

## Summary

Build the Deal Radar web frontend in `deal-radar/apps/web/`, using root planning docs as source of truth. The existing `frontend/` scaffold may be reused as starter material, but the final app location must follow repository guidance.

Design read: engineering-demo dashboard for hackathon judges, with clear cache-pipeline visibility over generic marketplace polish.

## Key Changes

- Use Next.js App Router, React 19, Tailwind v4, Geist fonts, and Server Components for feed/detail reads.
- Build `/` as the deal feed dashboard with verdict filter, cache badges, freshness, and discount math.
- Build `/demo` as the analyze console with raw Vietnamese post textarea, sample buttons, pipeline trace, and result panel.
- Build `/deals/[id]` as the detail page with raw post, normalized JSON, market comparison, cache path, and processing trace.
- Add `POST /api/analyze` route handler to proxy FastAPI `/api/v1/analyze`.
- After successful analyze, call `revalidateTag("deals", "max")` for Next 16 compatibility.
- Add `lib/api.ts`, `lib/types.ts`, and `lib/cache-tags.ts` for API access, shared contracts, and cache tags.

## UI Behavior

- Foreground engineering story: cache source, trace, normalized item, discount formula, and LLM calls avoided.
- Avoid cart, auth, checkout, seller chat, and live Facebook scraping in v1.
- Make demo states obvious:
  - First submit shows `miss`.
  - Same submit shows `redis_hit`.
  - Paraphrase submit shows `semantic_hit`.
- Add loading, empty, and error states for feed, detail, console, health, and metrics.
- Use compact dashboard layout: demo console and result trace first, feed and metrics nearby.
- Use system light/dark mode through CSS variables with one consistent accent system.

## Public Interfaces

Consume these backend endpoints:

- `GET /api/v1/deals?verdict=&q=&limit=&cursor=`
- `GET /api/v1/deals/{id}`
- `POST /api/v1/analyze`
- `GET /api/v1/metrics/cache`
- `GET /api/v1/health`

Render cache states exactly:

- `miss`
- `redis_hit`
- `semantic_hit`

Render verdicts exactly:

- `HOT_DEAL`
- `OK_DEAL`
- `IGNORE`

Use these environment variables:

```env
API_BASE_URL=http://api:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:18000
```

## Test Plan

- Component tests for cache badge, verdict filter, demo console, metrics panel, and detail rendering.
- Route handler tests for analyze proxy success, backend error handling, and `revalidateTag("deals", "max")`.
- Integration tests for first analyze `miss`, repeated analyze `redis_hit`, paraphrase `semantic_hit`, feed refresh, and metrics update.
- Verification commands:

```bash
npm run lint
npm run build
```

- Browser verification target: `http://localhost:13000`.

## Assumptions

- `COMPLETE_PLAN.md` overrides older planning docs.
- Backend API follows documented contract.
- Web is primary demo surface; mobile remains later.
- No live marketplace scraping in frontend.
- Current `frontend/` scaffold can be moved or regenerated into `deal-radar/apps/web/` during implementation.
