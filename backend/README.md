# Deal Radar

Deal Radar backend is a cache-first REST API for noisy resale posts. It extracts structured product data, compares asking price to market price, returns a verdict, and shows whether the result came from a miss, exact cache hit, or semantic cache hit.

`COMPLETE_PLAN.md` at the repository root remains the source of truth for scope and module boundaries.

## Local Stack

```bash
cd backend/infra/docker
docker compose --env-file ../.env up --build
```

Local URLs:

- API: `http://localhost:18000`
- Redis: `localhost:16379`
- ChromaDB: `http://localhost:18001`

## REST API

- `GET /api/v1/health`
- `POST /api/v1/deals/analyze`
- `GET /api/v1/deals`
- `GET /api/v1/deals/{deal_id}`
- `GET /api/v1/cache/metrics`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Environment

Copy `backend/.env.example` to `backend/.env` for local overrides. The Compose file already sets the default demo values:

- `USE_MOCK_LLM=true`
- `LLM_PROVIDER=openai`
- `OPENAI_API_KEY=`
- `OPENAI_MODEL=gpt-5.5`
- `STRICT_SOURCE_POLICY=false`
- `SEMANTIC_CACHE_THRESHOLD=0.90`
- `REDIS_URL=redis://redis:6379`
- `CHROMA_URL=http://chromadb:8000`
- `DATABASE_URL=postgresql://dealradar:dealradar@postgres:5432/deal_radar`
- `JWT_SECRET_KEY=dev-change-me-now`

## PostgreSQL + Migrations

- Auth schema migrations live in `backend/apps/api/db/migrations` and Prisma source in
  `backend/apps/api/prisma/schema.prisma`.
- API startup runs migrations once before route setup in the container.

To use the real OpenAI normalizer, set `USE_MOCK_LLM=false` and put `OPENAI_API_KEY` in `backend/.env`. The Compose file loads that file even when you run `docker compose up` from `backend/infra/docker`.

If `.env` is missing at `backend/.env`, copy from example:

```bash
cp backend/.env.example backend/.env
```

Start backend stack using root scripts:

```bash
cd backend/infra/docker
docker compose --env-file ../.env up --build
```

## Demo Verification

After the API is running:

```bash
python backend/scripts/demo_backend.py --base-url http://localhost:18000
```

The script posts a fresh sample, repeats it for an exact cache hit, posts a paraphrase for a semantic hit, and then reads cache metrics.

## Docs

- `backend/docs/ARCHITECTURE.md`
- `backend/docs/SOURCE_POLICY.md`
- `backend/docs/DEMO_SCRIPT.md`
- `backend/docs/backend-plan.md`

## Source Policy

V1 uses sample and manually pasted data only. Do not add live Facebook scraping, credential handling, access-control bypasses, or seller messaging automation.
