# Deal Radar Mobile

Expo 54 / React Native companion app for Deal Radar. Mobile proves ChatGPT-like deal chat, product browsing, multi-client cache behavior, deal detail, verdict filters, cache badges, offline stale state, pull-to-refresh, metrics, and service health.

## Environment

Create `.env` for simulator/local API access:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:18000
```

For Android emulator, use host bridge if `localhost` cannot reach API:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:18000
```

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

## API Contract

Mobile consumes:

- `GET /api/v1/deals?verdict=&q=&limit=&cursor=`
- `GET /api/v1/deals/{id}`
- `GET /api/v1/cache/metrics`
- `GET /api/v1/health`

Cache values: `miss`, `redis_hit`, `semantic_hit`.

Verdicts: `HOT_DEAL`, `OK_DEAL`, `IGNORE`.

## Cache Behavior

- Feed stale time: 30 seconds.
- Detail stale time: 5 minutes.
- Persisted cache max age: 24 hours via AsyncStorage.
- Pull-to-refresh forces refetch.
- Offline feed shows stale cached deals with visible banner.

## Screens

- `Chat` tab: ChatGPT-style assistant, prompt chips, bottom composer, product result previews, detail links.
- `Browse` tab: product feed, search, verdict chips, cache badges, freshness labels, cursor load more.
- `Metrics` tab: cache hit rate, LLM calls avoided/made, exact/semantic hits, health.
- `deals/[id]`: raw post, normalized item, market math, cache source, trace.

## Demo Fallback

The app calls API endpoints first. If API is unavailable, sample fallback data keeps chat, browse, detail, metrics, and health screens working for demo use.

Disable fallback when testing strict backend behavior:

```bash
EXPO_PUBLIC_USE_SAMPLE_FALLBACK=0
```
