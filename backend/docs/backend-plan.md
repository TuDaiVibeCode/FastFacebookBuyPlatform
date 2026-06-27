# Deal Radar Backend Plan

## Summary

Build the V1 backend as a FastAPI modular monolith under `backend/apps/api/`.
The backend is the core hackathon proof: noisy resale post text goes in, and
structured item data, deal verdict, discount math, cache source, trace, feed
records, health, and cache metrics come out.

This plan is based on all text files in the repository:

- `AGENTS.md`
- `COMPLETE_PLAN.md`
- `DEAL_RADAR_PLAN.md`
- `marketplace-deal-platform-plan.md`
- `frontend/package.json`
- `frontend/README.md`
- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/next.config.ts`
- `frontend/eslint.config.mjs`
- `frontend/tsconfig.json`
- `frontend/postcss.config.mjs`
- `frontend/.gitignore`
- SVG files in `frontend/public/`

`frontend/app/favicon.ico` is binary and was not decoded. The current
`frontend/` app is still a default Create Next App scaffold with no backend API
calls to preserve. The repo docs say implementation code and app docs should
live under `backend/`, so this backend plan lives in `backend/docs/`.

## Backend Goals

- Analyze noisy Vietnamese-style resale post text without relying on live
  Facebook access.
- Extract a normalized product item through a mock normalizer by default.
- Compare asking price against sample market prices.
- Return `HOT_DEAL`, `OK_DEAL`, or `IGNORE` verdicts.
- Demonstrate exact cache savings with Redis or Valkey.
- Demonstrate semantic cache savings with ChromaDB.
- Expose feed/detail endpoints for web and mobile clients.
- Expose health and cache metrics endpoints for the demo.
- Keep module boundaries ready for future PostgreSQL/PostGIS listing search.

## Non-Goals For Backend V1

- Auth.
- Payments.
- Push notifications.
- Full crawler.
- Automated Facebook interaction.
- Chat automation that contacts sellers.
- Production event bus.
- Memcached.
- Live marketplace credentials or scraping.

## Target Layout

```txt
backend/
  apps/
    api/
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
  packages/
    sample-data/
      raw_posts.txt
      market_price.json
  docs/
    backend-plan.md
    SOURCE_POLICY.md
  infra/
    docker/
      docker-compose.yml
      api.Dockerfile
  scripts/
    demo_backend.py
  .env.example
  README.md
```

## Public API

Base path: `/api/v1`.

### `POST /analyze`

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
    "currency": "VND",
    "sold_status": false,
    "location": null,
    "confidence": 0.91,
    "raw_text_hash": "sha256..."
  },
  "deal": {
    "market_price": 15000000,
    "discount_pct": 40,
    "verdict": "HOT_DEAL"
  },
  "trace": [
    "source_policy_ok",
    "redis_miss",
    "semantic_miss",
    "mock_llm",
    "scored",
    "stored"
  ]
}
```

Cache values:

- `miss`
- `redis_hit`
- `semantic_hit`

### `GET /deals`

Query params:

- `verdict`
- `q`
- `limit`
- `cursor`

Returns feed-ready deal cards with product name, asking price, market price,
discount, verdict, cache source, and freshness.

### `GET /deals/{id}`

Returns raw post text, normalized item, market comparison, cache source,
processing trace, source metadata, and freshness.

### `GET /health`

Returns status for:

- API.
- Redis or Valkey exact cache.
- ChromaDB semantic cache.
- Mock or real LLM mode.
- Sample data loaded.

### `GET /metrics/cache`

Returns:

- Exact cache hits.
- Semantic cache hits.
- LLM calls avoided.
- LLM calls made.
- Estimated cost saved.
- Cache hit rate.

## Data Models

### Analyze Request

- `text`: raw post text.
- `source`: optional source type, default `sample`.
- `source_url`: optional source URL for future approved sources.

### Normalized Item

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

### Deal Score

- `market_price`
- `discount_pct`
- `verdict`

Verdict rules:

- `HOT_DEAL`: discount is greater than or equal to 40%.
- `OK_DEAL`: discount is greater than or equal to 20% and less than 40%.
- `IGNORE`: sold post, missing price, invalid product, low confidence, missing
  market price, or discount below 20%.

### Deal Record

- `id`
- `raw_text`
- `source`
- `item`
- `deal`
- `cache`
- `trace`
- `created_at`
- `updated_at`

### Listing Boundary

Define a future-ready listing model but do not require PostgreSQL/PostGIS for
V1. Fields should cover product, price, source, source URL, freshness timestamp,
dedupe hash, confidence, location, optional geospatial point, and search text.

## Backend Modules

### `ingestion`

Goal: Prepare raw post input for the pipeline.

Responsibilities:

- Normalize whitespace.
- Compute stable SHA256 hash from normalized text.
- Emit `PostIngested`.

Acceptance criteria:

- Equivalent whitespace produces the same hash.
- Different post content produces different hashes.

### `source_policy`

Goal: Keep V1 safe and sample-data-first.

Responsibilities:

- Allow `sample`, `manual`, and `approved`.
- Reject unknown sources when `STRICT_SOURCE_POLICY=true`.
- Add trace warnings for unknown sources when strict mode is false.
- Document source rules in `backend/docs/SOURCE_POLICY.md`.
- Emit `SourcePolicyChecked`.

Acceptance criteria:

- Unknown source is rejected in strict mode.
- No live Facebook scraping or credential dependency exists.

### `cache`

Goal: Avoid repeated work for identical posts.

Responsibilities:

- Provide an exact cache interface.
- Implement in-memory fallback for local tests.
- Implement Redis or Valkey adapter.
- Use key format `post:sha256:{hash}`.
- Use 24 hour TTL.
- Store full analyze response.
- On hit, skip embedding, semantic cache, and normalizer.
- Emit `CacheHitRecorded`.

Acceptance criteria:

- First identical post returns `miss`.
- Second identical post returns `redis_hit`.
- Exact hit does not call semantic cache or normalizer.

### `semantic_cache`

Goal: Avoid normalizer calls for paraphrased posts.

Responsibilities:

- Provide a semantic cache interface.
- Implement deterministic in-memory fallback for tests and demo reliability.
- Implement optional ChromaDB adapter.
- Use collection `post_semantic_cache`.
- Use similarity threshold `0.90`.
- Store embedding and normalized item metadata.
- On hit, reuse normalized item and recompute deal score.

Acceptance criteria:

- Curated paraphrase can return `semantic_hit`.
- Semantic hit skips mock or real LLM normalizer.
- Market price changes are reflected when scoring a semantic hit.

### `normalization`

Goal: Extract structured item data from noisy resale text.

Responsibilities:

- Provide a normalizer interface.
- Use mock normalizer by default.
- Optionally support real LLM mode later.
- Recognize seed products:
  - Samsung Galaxy S23 Ultra.
  - iPhone 13 Pro.
  - MacBook Air M1.
  - AirPods Pro 2.
- Detect sold posts.
- Detect missing price.
- Set confidence.

Acceptance criteria:

- Demo works with no API key.
- Sold and missing-price posts become `IGNORE`.

### `pricing`

Goal: Load and serve reference market prices.

Responsibilities:

- Load `backend/packages/sample-data/market_price.json`.
- Return market prices by normalized product name.
- Report sample data readiness in `/health`.

Acceptance criteria:

- Known seed products return expected market prices.
- Unknown product produces an `IGNORE`-safe score path.

### `arbitrage`

Goal: Compute discount and verdict.

Responsibilities:

- Calculate discount percentage from asking price and market price.
- Apply verdict rules consistently.
- Handle missing, invalid, or zero prices safely.
- Emit `DealScored` and `HotDealDetected` when appropriate.

Acceptance criteria:

- Boundary tests pass for 40%, 20%, below 20%, sold, and missing price.

### `deals`

Goal: Store demo analysis records for feed/detail.

Responsibilities:

- Provide repository interface.
- Use in-memory persistence for V1.
- Store analyze results after successful processing.
- Support feed filters by verdict and text query.
- Support lookup by id.

Acceptance criteria:

- `/deals` returns recent records.
- `/deals/{id}` returns full detail for an existing id.
- Missing ids return a clear 404 response.

### `events`

Goal: Keep future event-driven migration explicit without adding infrastructure.

Responsibilities:

- Implement in-process event publishing.
- Record pipeline event names for traces and tests.
- Keep event types stable:
  - `PostIngested`
  - `SourcePolicyChecked`
  - `CacheHitRecorded`
  - `PostNormalized`
  - `DealScored`
  - `HotDealDetected`
  - `ListingStored`

Acceptance criteria:

- Tests can assert key events are emitted during analyze flow.

## Analyze Flow

1. Receive raw text and optional source metadata.
2. Normalize whitespace.
3. Compute SHA256 hash.
4. Check source policy.
5. Check exact cache.
6. If exact hit, return cached response with `cache = "redis_hit"`.
7. If exact miss, compute or fake embedding.
8. Query semantic cache.
9. If semantic hit, reuse normalized item, recompute score, store exact cache,
   persist deal, and return `cache = "semantic_hit"`.
10. If semantic miss, call mock normalizer.
11. Load market price.
12. Calculate discount and verdict.
13. Store full response in exact cache.
14. Store embedding and normalized metadata in semantic cache.
15. Persist deal record.
16. Emit events.
17. Return response with trace.

## Sample Data

Create `backend/packages/sample-data/raw_posts.txt` with 50 noisy resale
posts covering:

- Exact duplicates for exact cache demo.
- Paraphrases for semantic cache demo.
- Sold posts.
- Missing price posts.
- Slang and abbreviations.
- Mixed Vietnamese-style and English product names.

Create `backend/packages/sample-data/market_price.json`:

```json
{
  "Samsung Galaxy S23 Ultra": 15000000,
  "iPhone 13 Pro": 13000000,
  "MacBook Air M1": 14000000,
  "AirPods Pro 2": 3500000
}
```

## Sub-Agent Implementation Slices

### Agent 1: Scaffold And API Shell

Goal: Create the runnable FastAPI backend skeleton.

Relevant files:

- `backend/apps/api/app/main.py`
- `backend/apps/api/app/core/config.py`
- `backend/apps/api/app/shared/schemas.py`
- `backend/apps/api/tests/`

Proposed approach:

- Add package structure and dependency config.
- Add Pydantic DTOs.
- Add endpoint stubs for `/health`, `/analyze`, `/deals`, `/deals/{id}`, and
  `/metrics/cache`.
- Add a basic app factory or `app` object for tests.

Acceptance criteria:

- FastAPI imports successfully.
- OpenAPI includes all planned endpoints.
- `/api/v1/health` returns JSON.

Verify:

```bash
rtk python -m compileall backend/apps/api/app
rtk pytest backend/apps/api/tests -q
```

### Agent 2: Core Analyze Pipeline

Goal: Implement deterministic analysis without external services.

Relevant modules:

- `ingestion`
- `normalization`
- `pricing`
- `arbitrage`
- `deals`
- `events`

Proposed approach:

- Build hash, mock normalization, market price loading, score calculation, and
  in-memory deal persistence.
- Return complete analyze responses with trace.

Acceptance criteria:

- Known seed products normalize correctly.
- Missing price and sold posts return `IGNORE`.
- Discount calculation is correct.
- Deal feed and detail records are available after analysis.

Verify:

```bash
rtk pytest backend/apps/api/tests -q
```

### Agent 3: Exact Cache And Metrics

Goal: Add exact cache behavior and cache metrics.

Relevant modules:

- `cache`
- `metrics`

Proposed approach:

- Add cache interface, in-memory adapter, and Redis/Valkey adapter.
- Store full analyze responses by SHA256 hash.
- Track exact hits, LLM calls avoided, LLM calls made, and hit rate.

Acceptance criteria:

- First request returns `miss`.
- Second identical request returns `redis_hit`.
- Exact hit skips semantic lookup and normalizer.
- `/metrics/cache` reflects calls.

Verify:

```bash
rtk pytest backend/apps/api/tests -q
```

### Agent 4: Semantic Cache And Source Policy

Goal: Add paraphrase reuse and source safety.

Relevant modules:

- `semantic_cache`
- `source_policy`

Proposed approach:

- Add semantic cache interface, deterministic in-memory adapter, and optional
  ChromaDB adapter.
- Store normalized item metadata after misses.
- Reuse normalized item for semantic hits and recompute score.
- Add strict and non-strict source policy behavior.
- Add `backend/docs/SOURCE_POLICY.md`.

Acceptance criteria:

- Curated paraphrase returns `semantic_hit`.
- Semantic hit skips normalizer.
- Unknown source is rejected only in strict mode.

Verify:

```bash
rtk pytest backend/apps/api/tests -q
```

### Agent 5: Demo Data, Docker, And Docs

Goal: Make the backend demo repeatable.

Relevant files:

- `backend/packages/sample-data/raw_posts.txt`
- `backend/packages/sample-data/market_price.json`
- `backend/infra/docker/docker-compose.yml`
- `backend/infra/docker/api.Dockerfile`
- `backend/scripts/demo_backend.py`
- `backend/.env.example`
- `backend/README.md`

Proposed approach:

- Seed demo data.
- Add Docker Compose for API, Redis/Valkey, and ChromaDB.
- Add demo script that proves miss, exact hit, semantic hit, and metrics.
- Document run and test commands.

Acceptance criteria:

- Docker config validates.
- Demo script can run against a local API.
- README explains backend startup and verification.

Verify:

```bash
rtk docker compose -f backend/infra/docker/docker-compose.yml config
rtk python backend/scripts/demo_backend.py --base-url http://localhost:18000
```

## Testing Plan

Backend unit tests:

- Hash normalization is stable.
- Mock normalizer handles seed products.
- Sold post returns `IGNORE`.
- Missing price returns `IGNORE`.
- Discount thresholds are correct.
- Exact cache hit skips downstream work.
- Semantic hit skips normalizer and recomputes score.
- Strict source policy rejects unknown source.
- Domain events are emitted.

Backend API tests:

- `POST /api/v1/deals/analyze` returns `miss` for first request.
- Repeated request returns `redis_hit`.
- Paraphrased request returns `semantic_hit`.
- `GET /api/v1/deals` returns feed records.
- `GET /api/v1/deals/{id}` returns detail.
- Missing deal id returns 404.
- `GET /api/v1/health` reports dependency state.
- `GET /api/v1/cache/metrics` updates after analyze calls.

Integration tests:

- Docker stack starts.
- API can reach Redis/Valkey when configured.
- API can reach ChromaDB when configured.
- Demo script shows cache progression and metrics.

## Frontend Integration Notes

The root `frontend/` directory is outside the backend service boundary. Do not
place UI source under `backend/`.

When frontend work begins:

- Use native `fetch` first; no client data library is currently installed.
- Prefer Next route handlers for analyze proxying and cache invalidation.
- If the browser calls FastAPI directly, enable CORS for the dev frontend
  origin.
- Keep generated API contracts in `backend/packages/contracts/` if external
  clients need shared types.

## Done Criteria

Backend V1 is done when:

- `POST /analyze` handles noisy resale posts.
- Same post returns exact cache hit.
- Paraphrased post returns semantic cache hit.
- Missing price and sold posts return `IGNORE`.
- Deal verdict and discount math are visible in the response.
- Feed, detail, health, and metrics endpoints work.
- Mock normalizer works with no API key.
- Source policy is documented.
- Cache metrics show saved calls.
- Docker stack starts repeatably.
- No live Facebook scraping or marketplace credential dependency exists.

## Immediate Build Order

1. Scaffold `backend/` and FastAPI app.
2. Add schemas and endpoint shell.
3. Build ingestion, mock normalization, pricing, arbitrage, and deal storage.
4. Add exact cache and metrics.
5. Add semantic cache.
6. Add source policy doc and enforcement.
7. Add sample data.
8. Add Docker Compose.
9. Add demo script.
10. Run backend tests and demo smoke checks.
