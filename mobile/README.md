# Deal Radar Mobile

Expo 54 / React Native companion app for Deal Radar.

## Purpose

- Chat-based deal analysis powered by `/api/v1/deals/analyze`.
- Browse deal feed and view details with cache source + verdict.
- Register/login via JWT and reuse token for protected backend calls.

## Environment

Create `mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:18000
EXPO_PUBLIC_AUTH_TOKEN_KEY=deal-radar-auth-token
EXPO_PUBLIC_USE_SAMPLE_FALLBACK=1
```

Android emulator bridge if needed:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:18000
```

## Backend Link

Mobile consumes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/health`
- `GET /api/v1/deals`
- `GET /api/v1/deals/{id}`
- `POST /api/v1/deals/analyze`

After a successful auth flow, token from response is saved as `EXPO_PUBLIC_AUTH_TOKEN_KEY` and automatically sent as `Authorization: Bearer <token>` on requests.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run export:web
npm run ios
npm run android
npm run web
```

## Verification

1. Open `/auth` tab and register/login.
2. Ensure token is persisted locally.
3. Use chat and browse screens and confirm API calls are made through auth-aware headers.
