# Deal Radar

Deal Radar is a cache-first deal intelligence demo for noisy resale posts. It extracts structured product data, compares asking price to market price, returns a verdict, and shows whether the result came from a miss, exact Redis hit, or semantic ChromaDB hit.

`COMPLETE_PLAN.md` at the repository root remains the source of truth for scope and module boundaries.

## Local Stack

```bash
rtk docker compose -f backend/infra/docker/docker-compose.yml up --build
```

Local URLs:

- Web: `http://localhost:13000`
- API: `http://localhost:18000`
- Redis: `localhost:16379`
- ChromaDB: `http://localhost:18001`

## Environment

Copy `backend/.env.example` to `backend/.env` for local overrides. The Compose file already sets the default demo values:

- `USE_MOCK_LLM=true`
- `STRICT_SOURCE_POLICY=false`
- `SEMANTIC_CACHE_THRESHOLD=0.90`
- `REDIS_URL=redis://redis:6379`
- `CHROMA_URL=http://chromadb:8000`

## Demo Verification

After the API is running:

```bash
rtk python backend/scripts/demo_backend.py --base-url http://localhost:18000
```

The script posts a fresh sample, repeats it for an exact Redis hit, posts a paraphrase for a semantic hit, and then reads cache metrics.

## Docs

- `backend/docs/ARCHITECTURE.md`
- `backend/docs/SOURCE_POLICY.md`
- `backend/docs/DEMO_SCRIPT.md`
- `backend/docs/backend-plan.md`

## Source Policy

V1 uses sample and manually pasted data only. Do not add live Facebook scraping, credential handling, access-control bypasses, or seller messaging automation.
