# Complete Implementation Plan

## 1. Product Direction

Build Deal Radar: a cache-first deal intelligence platform for noisy Vietnamese resale posts and marketplace listings.

Primary demo goal:

- User submits or searches for a product deal.
- System extracts structured product data from messy social commerce text.
- System compares asking price to market price.
- System returns deal verdict, discount math, cache source, and freshness.
- Repeat and paraphrased inputs demonstrate exact and semantic cache savings.

Primary judging angle:

- Engineering Depth.
- Core value is the data and caching pipeline, not a generic deal UI.

V1 constraint:

- No live Facebook scraping dependency.
- Use sample data and documented source policy.
- Keep live marketplace integrations as post-MVP work.

## 2. MVP Scope

### In Scope

- FastAPI backend modular monolith.
- Next.js web dashboard and demo console.
- React Native companion app with local cache.
- Redis or Valkey exact cache.
- ChromaDB semantic cache.
- Mock LLM normalizer with optional real LLM mode.
- Sample Vietnamese resale posts.
- Market price reference file.
- Deal feed, deal detail, analyze flow, cache metrics.
- Source policy documentation for Facebook groups and other marketplaces.
- Docker Compose local stack.

### Out Of Scope For V1

- Auth.
- Payments.
- Push notifications.
- Full crawler.
- Automated Facebook interaction.
- Chat automation that sends messages to sellers.
- Production-scale event bus.
- Memcached.

## 3. Repository Layout

All implementation code must live under `backend/`.

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
    PLAN.md
    ARCHITECTURE.md
    SOURCE_POLICY.md
    DEMO_SCRIPT.md
  scripts/
    demo_backend.py
    seed_sample_data.py
  .env.example
  README.md
```

Root markdown files remain planning context only.

## 4. Architecture

### Backend

Stack:

- Python.
- FastAPI.
- Pydantic DTOs.
- PostgreSQL/PostGIS for future normalized listing search.
- Redis or Valkey for exact cache and hot listing cache.
- ChromaDB for semantic cache.
- Optional OpenAI embeddings and LLM extraction.
- Mock extraction for reliable offline demo.

Folder:

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
      listings/
      source_policy/
    shared/
      schemas.py
      errors.py
      ids.py
  tests/
```

Module responsibilities:

- `ingestion`: accept raw post text, normalize whitespace, compute stable hash.
- `normalization`: extract structured item from noisy Vietnamese text.
- `cache`: exact Redis or Valkey cache by SHA256.
- `semantic_cache`: embedding lookup and ChromaDB reuse for paraphrases.
- `pricing`: load market price references.
- `arbitrage`: calculate discount and verdict.
- `deals`: persist demo analyses for feed/detail.
- `listings`: normalized listing model and search-ready storage boundary.
- `source_policy`: record approved sources, API limits, retention rules.
- `events`: in-process domain events, replaceable later by Kafka, NATS, RabbitMQ, or Redis Streams.

Domain events:

- `PostIngested`
- `CacheHitRecorded`
- `PostNormalized`
- `DealScored`
- `HotDealDetected`
- `ListingStored`
- `SourcePolicyChecked`

### Web

Stack:

- Next.js App Router.
- Server Components for feed/detail reads.
- Route handler proxy for analyze.
- Cached `fetch` with tag invalidation.

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
    metrics-panel.tsx
  lib/
    api.ts
    cache-tags.ts
    types.ts
```

Screens:

- Deal feed dashboard.
- Deal detail.
- Demo console.
- Cache metrics panel.

### Mobile

Stack:

- React Native 0.84.
- TanStack Query.
- AsyncStorage persisted query cache.

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
- Offline stale cache state.
- Pull-to-refresh.

## 5. Data Pipeline

Analyze flow:

1. Receive raw post text.
2. Normalize whitespace.
3. Compute SHA256 hash.
4. Check source policy if source metadata exists.
5. Check Redis or Valkey exact cache.
6. If exact hit, return cached response.
7. If exact miss, create embedding.
8. Query ChromaDB semantic cache.
9. If semantic hit above threshold, reuse normalized item.
10. If semantic miss, call mock or real LLM normalizer.
11. Compare asking price against market price.
12. Calculate verdict.
13. Store full response in exact cache.
14. Store embedding and normalized item in semantic cache.
15. Store demo deal/listing record.
16. Emit domain events.
17. Return response.

Verdict rules:

- `HOT_DEAL`: discount >= 40%.
- `OK_DEAL`: discount >= 20% and discount < 40%.
- `IGNORE`: sold post, missing price, invalid product, low confidence, or discount < 20%.

## 6. Cache Strategy

### Exact Cache

- Backend store: Redis or Valkey.
- Key: `post:sha256:{hash}`.
- TTL: 24 hours.
- Value: full analyze response.
- Hit skips embedding, ChromaDB, and LLM.

### Semantic Cache

- Backend store: ChromaDB.
- Collection: `post_semantic_cache`.
- Similarity threshold: `0.90`.
- Stores embedding and normalized item metadata.
- Hit skips LLM but recomputes deal score if market price changed.

### Web Cache

- Deal feed: `revalidate: 30`, tag `deals`.
- Deal detail: `revalidate: 300`, tag `deal:{id}`.
- Market prices: `revalidate: 3600`, tag `market-prices`.
- Analyze route invalidates `deals` after successful analysis.

### Mobile Cache

- Feed stale time: 30 seconds.
- Detail stale time: 5 minutes.
- Persisted cache max age: 24 hours.
- Pull-to-refresh forces refetch.
- Offline state shows stale cached deals.

### CDN And Image Cache

Post-MVP or stretch:

- Proxy thumbnails through image cache.
- Serve static assets from CDN.
- Verify `Cache-Control` headers.
- Track CDN bandwidth and origin fetch reduction.

## 7. API Contract

Base path:

```txt
/api/v1
```

### `POST /deals/analyze`

Request:

```json
{
  "text": "pass ss s23 ultra 9tr xuoc dam nhe, gia hat de",
  "source": "sample"
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
  },
  "trace": [
    "redis_miss",
    "semantic_miss",
    "mock_llm",
    "scored",
    "stored"
  ]
}
```

`cache` values:

- `miss`
- `redis_hit`
- `semantic_hit`

### `GET /deals`

Query params:

- `verdict`
- `q`
- `limit`
- `cursor`

Returns:

- Deal cards with product, asking price, market price, discount, verdict, cache source, freshness.

### `GET /deals/{id}`

Returns:

- Raw post.
- Normalized item.
- Market comparison.
- Cache source.
- Processing trace.
- Source metadata if available.

### `GET /health`

Returns status for:

- API.
- Redis or Valkey.
- ChromaDB.
- Mock or real LLM mode.
- Sample data loaded.

### `GET /cache/metrics`

Returns:

- Exact cache hits.
- Semantic cache hits.
- LLM calls avoided.
- LLM calls made.
- Estimated cost saved.
- Cache hit rate.

## 8. Data Model

### Normalized Item

Fields:

- `product_name`
- `brand`
- `model`
- `condition`
- `asking_price`
- `currency`
- `sold_status`
- `location`
- `confidence`
- `raw_text_hash`

### Listing Model

Required future PostgreSQL/PostGIS fields:

- Product fields.
- Price fields.
- Location and geospatial point.
- Source name and source URL.
- Freshness timestamp.
- Dedupe hash.
- Normalization confidence.
- Search text.

V1 may keep records in memory or simple JSON persistence if time is tight. Keep module boundary ready for PostgreSQL.

## 9. Source Policy

Create `backend/docs/SOURCE_POLICY.md`.

Must document:

- Approved sources.
- Facebook group policy.
- Whether source has official API.
- Scraping limits.
- Retention rules.
- User privacy constraints.
- No credential sharing.
- No bypassing platform access controls.
- V1 uses sample data only.

Verification:

- Every demo source is marked `sample`, `manual`, or `approved`.
- Backend can reject unknown source type if strict mode enabled.

## 10. Sample Data

Folder:

```txt
backend/packages/sample-data/
  raw_posts.txt
  market_price.json
```

`raw_posts.txt` requirements:

- 50 noisy Vietnamese resale posts.
- Duplicate posts for exact cache demo.
- Paraphrased posts for semantic cache demo.
- Sold posts for `IGNORE`.
- Missing price posts for validation.
- Slang, misspellings, abbreviations, mixed Vietnamese/English product names.

`market_price.json` seed:

```json
{
  "Samsung Galaxy S23 Ultra": 15000000,
  "iPhone 13 Pro": 13000000,
  "MacBook Air M1": 14000000,
  "AirPods Pro 2": 3500000
}
```

## 11. Docker Plan

File:

```txt
backend/infra/docker/docker-compose.yml
```

Services:

- `api`: FastAPI.
- `web`: Next.js.
- `redis`: Redis Alpine or Valkey.
- `chromadb`: ChromaDB.

Ports:

- Web: `13000`.
- API: `18000`.
- Redis or Valkey: `16379`.
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
STRICT_SOURCE_POLICY=false
```

Run:

```bash
docker compose -f backend/infra/docker/docker-compose.yml up
```

## 12. Implementation Phases

### Phase 0: Project Scaffold

Tasks:

- Create `backend/` layout.
- Add root README and `.env.example`.
- Add docs placeholders.
- Add sample data folder.

Verify:

- Repo remains isolated.
- No generated app files outside `backend/`.

### Phase 1: Backend Core

Tasks:

- Add FastAPI app.
- Define Pydantic request/response schemas.
- Implement ingestion hash.
- Implement mock normalizer.
- Implement market price loader.
- Implement arbitrage verdict.
- Add `/health`, `/analyze`, `/deals`, `/deals/{id}`.

Verify:

- Raw post returns normalized item and verdict.
- Missing price returns `IGNORE`.
- Sold post returns `IGNORE`.
- Discount calculation correct.

### Phase 2: Exact Cache

Tasks:

- Add Redis or Valkey client.
- Cache full analyze response by SHA256.
- Add cache source to response.
- Add metrics counters.

Verify:

- First request returns `miss`.
- Same request returns `redis_hit`.
- Redis hit skips normalizer and semantic cache.

### Phase 3: Semantic Cache

Tasks:

- Add embedding adapter.
- Add mock embedding fallback if no API key.
- Add ChromaDB collection.
- Store normalized item metadata.
- Reuse semantic result above threshold.

Verify:

- Paraphrased same product post returns `semantic_hit`.
- Semantic hit skips LLM/mock normalizer.
- Market score recomputes on semantic hit.

### Phase 4: Web Demo

Tasks:

- Build Next.js feed dashboard.
- Build demo console.
- Build detail page.
- Add cache badge and trace display.
- Add API route proxy.
- Add tag invalidation after analyze.

Verify:

- Web at `http://localhost:13000` can analyze post.
- Feed updates after analyze.
- Detail page shows normalized JSON, discount formula, and cache path.
- Repeat input visibly changes cache badge from `miss` to `redis_hit`.

### Phase 5: Docker Compose

Tasks:

- Add Dockerfiles.
- Add Compose stack.
- Wire env vars.
- Add seed script.

Verify:

- Single command starts API, web, Redis/Valkey, ChromaDB.
- `/health` reports dependencies.
- Demo flow works from clean start.

### Phase 6: Mobile Companion

Tasks:

- Build React Native feed and detail screens.
- Add TanStack Query.
- Persist cache with AsyncStorage.
- Add offline stale banner.
- Add pull-to-refresh.

Verify:

- Recent searches survive app restart.
- Detail shows stale cached data offline.
- Pull-to-refresh refetches.

### Phase 7: Search And Listing Boundary

Tasks:

- Define normalized listing model.
- Add search endpoint placeholder or local sample search.
- Add source/freshness fields.
- Add dedupe hash.
- Document PostgreSQL/PostGIS migration path.

Verify:

- "keyboard near me" sample job can fetch from sample data, dedupe, store, and timestamp listings.
- Listing fields are queryable through module API.

### Phase 8: Metrics And Polish

Tasks:

- Add `/metrics/cache`.
- Add web metrics panel.
- Add demo script.
- Add architecture diagram notes.
- Finalize pitch.

Verify:

- Metrics show cache hit rate, LLM calls avoided, and estimated cost saved.
- Demo script can be followed without improvisation.

## 13. Testing Plan

### Backend Tests

- Exact Redis hit skips embedding and LLM/mock normalizer.
- Semantic hit skips LLM/mock normalizer.
- Missing API key uses mock normalizer.
- Sold post returns `IGNORE`.
- Missing price returns `IGNORE`.
- Discount calculation correct.
- Domain events emitted after analysis.
- `/health` reports Redis/Valkey and ChromaDB status.
- Unknown source rejected in strict policy mode.

### Web Tests

- Feed uses cached server fetch.
- Analyze route invalidates `deals` tag.
- Detail page renders normalized item and cache source.
- Demo console displays pipeline trace.
- Cache badge renders all cache states.

### Mobile Tests

- Query cache persists after app restart.
- Offline feed shows stale cached deals.
- Pull-to-refresh refetches.
- Detail handles missing or stale deal.

### Integration Tests

- Docker stack starts.
- First analyze returns `miss`.
- Second same analyze returns `redis_hit`.
- Similar paraphrase returns `semantic_hit`.
- Web and mobile consume same API contract.
- Metrics update after analyze calls.

### Load And Bandwidth Tests

Post-MVP or final stretch:

- Load-test common search flows.
- Measure p95 latency.
- Measure third-party fetch volume.
- Measure origin bandwidth.
- Confirm cache hit rates meet target.

## 14. Demo Script

Target script:

```txt
backend/scripts/demo_backend.py
```

Demo flow:

1. Start Docker stack.
2. Call API health at `http://localhost:18000/api/v1/health`.
3. Analyze fresh noisy Vietnamese post with `POST /api/v1/deals/analyze`.
4. Show `miss`.
5. Analyze same post again.
6. Show `redis_hit`.
7. Analyze paraphrased post.
8. Show `semantic_hit`.
9. Open deal detail.
10. Show normalized JSON and discount formula.
11. Open cache metrics.
12. Explain saved LLM calls and event-ready modular monolith.

Pitch line:

```txt
UI tim deal de. Phan kho la bien du lieu social commerce tieng Viet khong cau truc thanh JSON tin cay, cache duoc, scale duoc, va san sang tach event-driven.
```

## 15. Done Criteria

MVP done when:

- Backend analyzes noisy resale posts.
- Same post returns exact cache hit.
- Paraphrased post returns semantic cache hit.
- Deal verdict and discount math are visible.
- Web demo works without live Facebook dependency.
- Mobile app shows feed/detail and local stale cache behavior.
- Source policy is documented.
- Cache metrics show savings.
- Docker stack starts repeatably.

Engineering story done when:

- Data pipeline is modular.
- Cache layers are observable.
- LLM failure has mock fallback.
- Event boundaries are explicit.
- Future PostgreSQL/PostGIS and marketplace ingestion path is documented.

## 16. Priority Order

Recommended hackathon order:

1. Backend pipeline with mock normalizer.
2. Exact cache.
3. Semantic cache.
4. FastAPI endpoints.
5. Web dashboard and demo console.
6. Docker Compose.
7. Metrics page.
8. Source policy doc.
9. React Native companion app.
10. Search/listing boundary.
11. CDN/image cache notes.
12. Pitch polish.

Do not start with mobile. Web demo proves system behavior faster.

## 17. Risks And Mitigations

### Risk: Live marketplace access breaks demo

Mitigation:

- Use sample data in v1.
- Document live source policy.
- Keep source adapters behind module boundary.

### Risk: LLM quota or network failure

Mitigation:

- Mock normalizer must be default.
- Real LLM mode must be optional.

### Risk: Semantic cache unreliable

Mitigation:

- Use curated paraphrase samples.
- Show threshold in response trace.
- Fall back to mock normalizer on low similarity.

### Risk: Scope too large

Mitigation:

- Backend plus web demo is required.
- Mobile and search ingestion are stretch after core cache story works.

### Risk: Generic UI weakens engineering pitch

Mitigation:

- UI must foreground pipeline trace, normalized JSON, cache state, and metrics.
- Avoid spending time on non-core marketplace browsing.

## 18. Immediate Next Actions

1. Scaffold `backend/`.
2. Build FastAPI schemas and mock analyze pipeline.
3. Add sample posts and market prices.
4. Add exact cache.
5. Add semantic cache.
6. Build Next.js demo console.
7. Run full demo script locally.
