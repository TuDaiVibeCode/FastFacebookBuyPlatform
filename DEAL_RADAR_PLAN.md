# Deal Radar - Hackathon Architecture Plan

## Context

Idea: build app that finds good deals from Facebook-style resale posts.

Track risk:

- Normal "deal finder app" fits Market Scale or Impact track.
- For Engineering Depth, core value must be data engine, not UI.
- Hard problem: Vietnamese social commerce text is unstructured, slang-heavy, misspelled, and inconsistent.

Example raw posts:

- `Pass lại đth ss s23 ultra giá hạt dẻ, xước dăm nhẹ, giá mầm non ib`
- `Cần bay samsung s23u 9tr, còn ngon, ai lấy ib`
- `Pass mac m1 pin trâu, fix nhẹ cho ae thiện chí`

Engineering angle:

- Convert noisy Vietnamese posts into clean structured JSON.
- Cache expensive LLM calls.
- Use semantic cache for near-duplicate posts.
- Compare extracted asking price against market price.
- Flag arbitrage opportunities.

## Product Goal

Build a cache-first deal intelligence platform:

- Web frontend: Next.js.
- Mobile app: React Native 0.84.
- Backend: FastAPI modular monolith.
- Infra: Redis exact cache, ChromaDB semantic cache, Docker Compose.
- Data: sample posts in file, no live Facebook scraping in v1.

Success criteria:

- Demo works reliably without live Facebook dependency.
- First run shows cache miss and LLM/mock extraction.
- Second same input shows Redis hit.
- Paraphrased input shows semantic cache hit.
- UI shows deal verdict, discount math, cache source, and normalized data.
- Architecture can later move from modular monolith to event-driven services.

## Repository Isolation

All application code should live under one folder to avoid conflict with other work:

```txt
backend/
  apps/
    web/
    mobile/
    api/
  packages/
    contracts/
    sample-data/
  infra/
    docker/
    redis/
    chroma/
  docs/
  scripts/
  .env.example
  README.md
```

This file lives at repo root as planning context. Future generated source should stay inside `backend/`.

## Folder Layout

```txt
backend/
  apps/
    web/                    # Next.js App Router frontend
    mobile/                 # React Native 0.84 app
    api/                    # FastAPI modular monolith
  packages/
    contracts/              # OpenAPI schema + shared generated TS types
    sample-data/            # raw_posts.txt, market_price.json
  infra/
    docker/
      docker-compose.yml
      api.Dockerfile
    redis/
    chroma/
  docs/
    PLAN.md
    ARCHITECTURE.md
    DEMO_SCRIPT.md
  scripts/
    demo_backend.py
    seed_sample_data.py
  .env.example
  README.md
```

## Backend Architecture

Backend stack:

- Python.
- FastAPI.
- Pydantic DTOs.
- Redis for exact cache.
- ChromaDB for semantic cache.
- Optional OpenAI embedding and LLM APIs.
- Mock fallback for offline demo.

Backend folder:

```txt
apps/api/
  app/
    main.py
    core/
      config.py
      logging.py
      events.py
    modules/
      ingestion/
      normalization/
      cache/
      semantic_cache/
      arbitrage/
      deals/
      pricing/
    shared/
      schemas.py
      errors.py
      ids.py
  tests/
```

Module responsibilities:

- `ingestion`: receive raw post text, compute stable hash.
- `cache`: Redis exact cache by SHA256.
- `semantic_cache`: embedding + ChromaDB vector search.
- `normalization`: LLM/mock extraction from noisy Vietnamese into structured item.
- `pricing`: load market reference prices.
- `arbitrage`: compute discount and verdict.
- `deals`: store demo results for feed/detail.
- `events`: in-process event bus for future event-driven migration.

Domain events:

- `PostIngested`
- `CacheHitRecorded`
- `PostNormalized`
- `DealScored`
- `HotDealDetected`

For v1, events run in-process. Later, event bus adapter can be replaced with Kafka, NATS, RabbitMQ, or Redis Streams.

## Data Pipeline

Pipeline flow:

1. Receive raw post text.
2. Normalize whitespace and compute SHA256 hash.
3. Check Redis exact cache.
4. If Redis hit, return cached analysis.
5. If Redis miss, create embedding.
6. Query ChromaDB semantic cache.
7. If semantic hit above threshold, reuse normalized item.
8. If semantic miss, call LLM extraction or mock normalizer.
9. Compare asking price with market price.
10. Compute verdict.
11. Store result in Redis and ChromaDB.
12. Emit domain events.
13. Return response to web/mobile.

Verdict rules:

- `HOT_DEAL`: discount >= 40%.
- `OK_DEAL`: discount >= 20% and < 40%.
- `IGNORE`: sold post, missing price, invalid product, low confidence, or discount < 20%.

## Cache Strategy

### Redis Exact Cache

Purpose: avoid repeated work for identical posts.

- Key: `post:sha256:{hash}`
- TTL: 24 hours.
- Value: full analyze response.
- Hit skips embedding, ChromaDB, and LLM.

### ChromaDB Semantic Cache

Purpose: avoid LLM calls for posts with same meaning but different wording.

- Collection: `post_semantic_cache`.
- Similarity threshold: `0.90`.
- Stores embedding and normalized item metadata.
- Hit skips LLM but can recompute deal score if market price changed.

Example:

- `Bán đt ss s23 9tr còn ngon`
- `Pass samsung galaxy s23 giá 9 triệu, máy ổn`

These should hit semantic cache if embeddings are close enough.

### Next.js Cache

Purpose: save backend bandwidth and make web demo fast.

- Use App Router.
- Server Components for deal feed and detail reads.
- Use cached `fetch`.
- Use tag invalidation after new analysis.

Suggested policies:

- Deal feed: `revalidate: 30`, tag `deals`.
- Deal detail: `revalidate: 300`, tag `deal:{id}`.
- Market prices: `revalidate: 3600`, tag `market-prices`.

Analyze route:

- Next.js route handler proxies `POST /api/analyze` to FastAPI.
- After successful analysis, call `revalidateTag("deals")`.

### React Native Cache

Purpose: save bandwidth and support stale/offline mobile UX.

- Use TanStack Query.
- Persist query cache with AsyncStorage.
- Feed stale time: 30 seconds.
- Detail stale time: 5 minutes.
- Persisted cache max age: 24 hours.
- Pull-to-refresh forces refetch.
- Offline mode shows stale cached deals and visible stale state.

## API Contract

Base path:

```txt
/api/v1
```

### POST /deals/analyze

Request:

```json
{
  "text": "pass ss s23 ultra 9tr xước dăm nhẹ, giá hạt dẻ"
}
```

Response:

```json
{
  "id": "deal_01",
  "cache": "miss",
  "item": {
    "product_name": "Samsung Galaxy S23 Ultra",
    "brand": "Samsung",
    "model": "Galaxy S23 Ultra",
    "condition": "used_good",
    "asking_price": 9000000,
    "sold_status": false,
    "confidence": 0.91
  },
  "deal": {
    "market_price": 15000000,
    "discount_pct": 40,
    "verdict": "HOT_DEAL"
  }
}
```

`cache` values:

- `miss`
- `redis_hit`
- `semantic_hit`

### GET /deals

Query params:

- `verdict`
- `q`
- `limit`
- `cursor`

### GET /deals/{id}

Returns:

- raw post
- normalized item
- market comparison
- cache source
- processing trace

### GET /health

Returns service status:

- API
- Redis
- ChromaDB
- mock or real LLM mode

### GET /cache/metrics

Returns demo metrics:

- Redis hits.
- Semantic hits.
- LLM calls avoided.
- LLM calls made.
- Estimated cost saved.

## Next.js Frontend

Folder:

```txt
apps/web/
  app/
    page.tsx
    deals/[id]/page.tsx
    demo/page.tsx
    api/analyze/route.ts
  components/
    deal-table.tsx
    deal-card.tsx
    cache-badge.tsx
    verdict-filter.tsx
    demo-console.tsx
  lib/
    api.ts
    cache-tags.ts
    types.ts
```

Screens:

- Deal feed dashboard.
- Deal detail.
- Demo console.

Deal feed:

- Shows product, asking price, market price, discount, verdict.
- Filters by verdict.
- Shows cache badge.
- Uses server-side cached fetch.

Deal detail:

- Shows raw post.
- Shows normalized JSON.
- Shows discount formula.
- Shows cache path.
- Shows processing time.

Demo console:

- Textarea for raw post.
- Analyze button.
- Pipeline trace: Redis -> Chroma -> LLM/mock -> arbitrage.
- Repeat same post to show Redis hit.
- Submit paraphrase to show semantic hit.

## React Native Mobile

Folder:

```txt
apps/mobile/
  src/
    screens/
      DealFeedScreen.tsx
      DealDetailScreen.tsx
    components/
      DealCard.tsx
      CacheBadge.tsx
      OfflineBanner.tsx
    lib/
      api.ts
      queryClient.ts
      storagePersister.ts
```

Scope:

- Feed screen.
- Detail screen.
- Verdict filter.
- Cache source badge.
- Offline stale cache.
- Pull-to-refresh.

Out of scope for v1:

- Auth.
- Push notifications.
- Full crawler.
- Payments.
- Chat automation.

## Docker Plan

Docker Compose file:

```txt
backend/infra/docker/docker-compose.yml
```

Services:

- `api`: FastAPI.
- `web`: Next.js.
- `redis`: Redis Alpine.
- `chromadb`: ChromaDB.

Host ports chosen to reduce conflict:

- Web: `13000`.
- API: `18000`.
- Redis: `16379`.
- ChromaDB: `18001`.

Environment:

```env
API_BASE_URL=http://api:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:18000
REDIS_URL=redis://redis:6379
CHROMA_URL=http://chromadb:8000
SEMANTIC_CACHE_THRESHOLD=0.90
USE_MOCK_LLM=true
OPENAI_API_KEY=
```

Run command:

```bash
docker compose -f backend/infra/docker/docker-compose.yml up
```

## Sample Data

Folder:

```txt
backend/packages/sample-data/
  raw_posts.txt
  market_price.json
```

`raw_posts.txt`:

- 50 noisy Vietnamese resale posts.
- Include duplicate and paraphrased posts to demo Redis and semantic cache.
- Include sold posts to demo `IGNORE`.
- Include missing price posts to demo validation.

`market_price.json`:

```json
{
  "Samsung Galaxy S23 Ultra": 15000000,
  "iPhone 13 Pro": 13000000,
  "MacBook Air M1": 14000000,
  "AirPods Pro 2": 3500000
}
```

## Demo Script

Target script:

```txt
backend/scripts/demo_backend.py
```

Demo flow:

1. Start Docker stack.
2. Call API health at `http://localhost:18000/api/v1/health`.
3. Analyze fresh post with `POST /api/v1/deals/analyze`.
4. Show `miss`.
5. Analyze same post again.
6. Show `redis_hit`.
7. Analyze paraphrased post.
8. Show `semantic_hit`.
9. Open cache metrics.
10. Explain saved LLM cost and event-ready modular monolith.

Pitch line:

> UI tìm deal dễ. Phần khó là biến dữ liệu social commerce tiếng Việt không cấu trúc thành JSON tin cậy, cache được, scale được, và sẵn sàng tách event-driven.

## Testing Plan

Backend tests:

- Exact Redis hit skips embedding and LLM.
- Semantic hit skips LLM.
- Missing API key uses mock normalizer.
- Sold post returns `IGNORE`.
- Missing price returns `IGNORE`.
- Discount calculation correct.
- Domain event emitted after analysis.
- `/health` reports Redis and ChromaDB status.

Next.js tests:

- Feed uses cached server fetch.
- Analyze route invalidates `deals` tag.
- Detail page renders normalized item and cache source.
- Demo console displays pipeline trace.

React Native tests:

- Query cache persists after app restart.
- Offline feed shows stale cached deals.
- Pull-to-refresh refetches.
- Detail handles missing or stale deal.

Integration tests:

- Docker stack starts.
- First analyze returns `miss`.
- Second same analyze returns `redis_hit`.
- Similar paraphrase returns `semantic_hit`.
- Web and mobile consume same API contract.

## Build Order

Recommended hackathon order:

1. Backend pipeline with mock LLM.
2. Redis exact cache.
3. Chroma semantic cache.
4. FastAPI endpoints.
5. Next.js dashboard and demo console.
6. Docker Compose.
7. React Native companion app.
8. Metrics page and pitch polish.

Do not start with mobile. Web demo proves system faster.

## Assumptions

- Primary judging target: Engineering Depth.
- Primary demo surface: Next.js web.
- React Native app proves multi-client cache strategy, not full parity.
- Backend stays modular monolith for hackathon speed.
- Future event-driven transition happens through event bus adapter.
- No live Facebook scraping in v1.
- Mock LLM must exist so demo does not fail from quota or network.
- All generated implementation files stay inside `backend/`.
