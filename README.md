# Deal Radar Platform

Monorepo for Deal Radar: backend API, web frontend, mobile app, and optional landing page.

## Project layout

- `backend/` FastAPI service with Redis, ChromaDB, and PostgreSQL.
- `frontend/` Next.js App Router client, browse/deals/chat UI.
- `mobile/` Expo React Native app with same features on mobile.
- `landing/` marketing/static entry point placeholder and docs.
- `backend/docs/` architecture, policy, and demo docs.
- `scripts/` helper scripts to start full stack.

## Run local stack

1. Backend (required for all clients):

```bash
cp backend/.env.example backend/.env
cd backend/infra/docker
docker compose --env-file ../../.env up --build
```

2. Frontend:

```bash
cd frontend
npm install
npm run dev -- --port ${FRONTEND_PORT:-3000}
```

3. Mobile:

```bash
cd mobile
npm install
npm run start -- --port ${MOBILE_PORT:-8081}
```

4. Optional all-in-one start:

```bash
bash scripts/run-all.sh        # macOS / Linux
```

Windows:

```bat
scripts\run-all.bat
```

## API and auth integration

Backend base URL:

- `http://localhost:${API_HTTP_PORT:-18000}`

Auth endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

All protected frontend/mobile calls send `Authorization: Bearer <access_token>` from stored auth token.

Data endpoints:

- `GET /api/v1/health`
- `GET /api/v1/deals`
- `GET /api/v1/deals/{id}`
- `POST /api/v1/deals/analyze`
- `GET /api/v1/cache/metrics`

## Local verification

1. API health: `http://localhost:18000/api/v1/health`
2. Frontend runtime: `http://localhost:${FRONTEND_PORT:-3000}`
3. Mobile Metro: `http://localhost:${MOBILE_PORT:-8081}`
4. Landing page: `http://localhost:${LANDING_PORT:-3002}`
5. Login/register on `/auth/login`, `/auth/register` in frontend and `/auth` tab in mobile.
6. Analyze or browse listings and confirm backend returns `cache`, `deal`, and `trace` fields.

## Notes

- JWT is required for many frontend/mobile flows.
- Backend uses PostgreSQL auth schema and runtime migration on startup.
- Sample data paths are defined in `backend/packages/sample-data`.
- Complete planning source: `COMPLETE_PLAN.md` and `backend/docs/backend-plan.md`.
