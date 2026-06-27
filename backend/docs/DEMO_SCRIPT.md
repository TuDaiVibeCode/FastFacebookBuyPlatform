# Demo Script

This is the operator runbook for the hackathon demo.

## Start

From the repository root:

```bash
rtk docker compose -f backend/infra/docker/docker-compose.yml up --build
```

Open:

- API health: `http://localhost:18000/api/v1/health`
- ChromaDB: `http://localhost:18001`

## Backend Cache Proof

Run:

```bash
rtk python backend/scripts/demo_backend.py --base-url http://localhost:18000
```

Expected progression:

1. Fresh Samsung S23 Ultra post returns `miss`.
2. Same post returns `redis_hit`.
3. Paraphrased Samsung S23 Ultra post returns `semantic_hit`.
4. Cache metrics show avoided normalizer or LLM work.

## Talk Track

The UI is the easy part. The hard part is converting unstructured Vietnamese social-commerce text into reliable JSON, making expensive normalization cacheable, and keeping the pipeline observable enough to scale or split into event-driven services later.

## Fallback

If the stack already has warm cache data, reset Redis and Chroma volumes before the demo:

```bash
rtk docker compose -f backend/infra/docker/docker-compose.yml down -v
rtk docker compose -f backend/infra/docker/docker-compose.yml up --build
```

If a real LLM key is unavailable, keep `USE_MOCK_LLM=true`. The demo is designed to work offline from live marketplace and LLM dependencies.
