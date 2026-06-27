# Architecture

Deal Radar is a modular monolith for the hackathon demo. The core path turns noisy Vietnamese resale text into normalized item data, deal math, cache state, and an observable trace.

## Local Stack

- Web: Next.js at `http://localhost:13000`.
- API: FastAPI at `http://localhost:18000`.
- Redis: exact cache on host port `16379`.
- ChromaDB: semantic cache on host port `18001`.

Internal service URLs in Docker:

- `API_BASE_URL=http://api:8000`
- `REDIS_URL=redis://redis:6379`
- `CHROMA_URL=http://chromadb:8000`

## Analyze Flow

1. Receive raw post text and source metadata.
2. Normalize whitespace and compute a stable SHA256 hash.
3. Check source policy.
4. Check Redis exact cache at `post:sha256:{hash}`.
5. On exact hit, return the cached full response with `cache=redis_hit`.
6. On exact miss, compute or mock an embedding.
7. Query ChromaDB collection `post_semantic_cache`.
8. On semantic hit above `SEMANTIC_CACHE_THRESHOLD`, reuse the normalized item and recompute deal score.
9. On semantic miss, run mock or real normalization.
10. Compare asking price to market reference data.
11. Store the response in Redis and normalized metadata in ChromaDB.
12. Persist a demo deal record for feed/detail views.
13. Return item data, verdict, trace, and cache source.

## Boundaries

- `ingestion`: whitespace normalization and stable hashing.
- `source_policy`: source allowlist, strict mode, and trace warnings.
- `cache`: Redis exact cache with in-memory fallback for tests.
- `semantic_cache`: ChromaDB cache with deterministic fallback for tests.
- `normalization`: mock normalizer by default, optional real LLM later.
- `pricing`: sample market price loading.
- `arbitrage`: discount and verdict rules.
- `deals`: demo feed/detail persistence.
- `events`: in-process event records for future event bus migration.

## Verdict Rules

- `HOT_DEAL`: discount is at least 40%.
- `OK_DEAL`: discount is at least 20% and below 40%.
- `IGNORE`: sold post, missing price, invalid product, low confidence, missing market price, or discount below 20%.

## Future Migration Path

The V1 monolith keeps event names stable so modules can later move behind Kafka, NATS, RabbitMQ, Redis Streams, or a managed queue. The listing boundary should be ready for PostgreSQL/PostGIS without making that database a V1 dependency.
