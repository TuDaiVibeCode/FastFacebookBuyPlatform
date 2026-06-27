# Deal Radar Mobile Plan

## Summary

Build the Deal Radar mobile companion app from the existing Expo scaffold, while keeping the final implementation target aligned with repository docs: `deal-radar/apps/mobile/`.

Mobile is not the primary hackathon demo. Its job is to prove multi-client cache behavior: feed, detail, verdict filter, cache badge, offline stale state, and pull-to-refresh.

Use `COMPLETE_PLAN.md` as the source of truth. The current `mobile/` scaffold uses Expo 54, React Native 0.81.5, Expo Router, TypeScript, and template tabs. Root docs mention React Native 0.84, so implementation should either upgrade intentionally later or record the Expo scaffold version as the current baseline.

## Key Changes

- Replace Expo template content with Deal Radar screens.
- Build a deal feed tab with deal cards, verdict filter, cache badges, freshness labels, and pull-to-refresh.
- Build a deal detail route with raw post, normalized item, asking price, market price, discount, verdict, cache source, and trace.
- Build a metrics/status tab with cache hit rate, LLM calls avoided, and API/Redis/Chroma/mock-mode health.
- Add TanStack Query with AsyncStorage persistence.
- Add API access for feed, detail, metrics, and health endpoints.
- Keep v1 out of scope: auth, payments, push notifications, full crawler, automated Facebook actions, and seller chat.

## Cache Behavior

- Feed stale time: 30 seconds.
- Detail stale time: 5 minutes.
- Persisted cache max age: 24 hours.
- Pull-to-refresh forces refetch.
- Offline mode shows stale cached deals with a visible banner.

## Implementation Shape

Keep Expo Router unless the project is moved or regenerated into `deal-radar/apps/mobile/`.

Rename tab labels:

- `Home` -> `Deals`
- `Explore` -> `Metrics`

Add mobile modules:

```txt
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

Use documented cache states exactly:

- `miss`
- `redis_hit`
- `semantic_hit`

Use documented verdicts exactly:

- `HOT_DEAL`
- `OK_DEAL`
- `IGNORE`

Use this environment variable for simulator and local dev:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:18000
```

For Android emulator, use this value if `localhost` cannot reach the host API:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:18000
```

## Backend Contract

Consume these backend endpoints:

- `GET /api/v1/deals?verdict=&q=&limit=&cursor=`
- `GET /api/v1/deals/{id}`
- `GET /api/v1/metrics/cache`
- `GET /api/v1/health`

Expected analyze response shape, reused by detail and feed data:

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

## Test Plan

- Query cache persists after app restart.
- Offline feed shows stale cached deals with visible banner.
- Pull-to-refresh refetches feed and updates freshness.
- Detail screen handles missing, stale, and refreshed deal data.
- Cache badge renders all cache states.
- Verdict filter renders all verdicts and updates query.
- Mobile consumes the same backend contract as web.

Verification commands:

```bash
npm run lint
npm run ios
npm run android
```

Manual verification:

- Load feed once while API is running.
- Stop API or disable network.
- Reopen app.
- Confirm stale cached feed appears with offline banner.
- Restore API.
- Pull to refresh.
- Confirm fresh feed replaces stale data.

## Assumptions

- `COMPLETE_PLAN.md` overrides older docs.
- `mobile/` is the current scaffold folder; final product code should move or regenerate under `deal-radar/apps/mobile/`.
- Backend and web demo are built first; mobile follows after API contract stabilizes.
- Mobile proves local cache and stale/offline behavior, not full web parity.
- No live Facebook scraping or marketplace automation in mobile v1.
