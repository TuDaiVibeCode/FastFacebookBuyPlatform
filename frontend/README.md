# Deal Radar Frontend

Next.js App Router frontend for Deal Radar.

## Purpose

- Analyze noisy resale posts through chat or demo flow.
- Browse deal feed with caching state and verdict badges.
- Inspect deal detail with normalized item + market compare + trace.
- Authenticate users via JWT and persist local token.
- Reuse the same backend contract as mobile.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind v4 + custom CSS

## Backend Link

The frontend uses base URL from env:

- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

Default is `http://localhost:18000`.

Backend endpoints consumed:

- `GET /api/v1/health`
- `GET /api/v1/deals`
- `GET /api/v1/deals/{id}`
- `POST /api/v1/deals/analyze`
- `GET /api/v1/cache/metrics`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Auth Pages

Pages:

- `/auth/login`
- `/auth/register`

Flow:

- Submit email + password.
- Backend returns `{ access_token, token_type, user }`.
- Token is stored in browser `localStorage` key `deal-radar-access-token`.

## Environment

Create `.env.local` if needed:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:18000
```

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Runtime URLs

- `http://localhost:3000` (frontend app)
- Backend local default: `http://localhost:18000`

## Verification Checklist

- Open `/` and run analysis from `/chat` or `/demo`.
- Revisit with same post should show `redis_hit`.
- Paraphrased post should show `semantic_hit`.
- Auth pages load and token saves after login/register.
