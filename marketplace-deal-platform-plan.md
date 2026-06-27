# Marketplace Deal Platform

## Goal
Build a web and mobile platform where users search for products, see nearby Facebook-group deals, chat with an AI assistant, and switch into a browser-like view when they need to inspect a source.

## Tasks
- [ ] Define source policy for Facebook groups and other marketplaces -> Verify: approved sources, API/scraping limits, and data-retention rules are documented.
- [ ] Build normalized listing model in PostgreSQL/PostGIS -> Verify: product, price, location, source, freshness, and dedupe fields are queryable.
- [ ] Add search ingestion workers -> Verify: a "keyboard near me" job fetches, dedupes, stores, and timestamps listings.
- [ ] Implement Redis/Valkey cache layer -> Verify: repeated searches hit cache, hot listings stay in memory, and stale refresh jobs run in background.
- [ ] Add CDN and image proxy caching -> Verify: thumbnails and static assets are served from edge cache with correct Cache-Control headers.
- [ ] Build ChatGPT-style chat interface -> Verify: chat can call the search API and render listing cards with source links.
- [ ] Build browser-like source view -> Verify: user can open an original listing/source without streaming every search session through a remote browser.
- [ ] Add mobile local cache -> Verify: recent searches and listing details survive app restart and refresh in background.
- [ ] Instrument cache and bandwidth metrics -> Verify: dashboards show cache hit rate, origin fetches, CDN bandwidth, and per-user request rate.
- [ ] Verification last: load-test common search flows -> Verify: p95 latency, third-party fetch volume, and bandwidth stay inside target budgets.

## Done When
- [ ] The MVP returns nearby product deals with clear freshness labels.
- [ ] Backend bandwidth and third-party fetches are reduced by CDN, Redis/Valkey, and client caching.
- [ ] The system respects source permissions and user privacy.

## Notes
Use Redis-compatible Valkey if open-source licensing or cloud portability matters. Keep Memcached out of the MVP unless profiling proves you only need a very large, simple key-value cache.
