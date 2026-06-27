# Source Policy

Deal Radar V1 is sample-data-first. The demo must not depend on live Facebook scraping, private group credentials, seller automation, or any bypass of marketplace access controls.

## Approved Source Types

- `sample`: Curated posts stored in `deal-radar/packages/sample-data/`.
- `manual`: Text pasted by a user for one-off analysis.
- `approved`: A future integration that has documented permission, rate limits, and retention rules.

Unknown source types are allowed only when `STRICT_SOURCE_POLICY=false`, and responses should include a warning trace. When `STRICT_SOURCE_POLICY=true`, the API should reject unknown source types before cache or normalization work.

## Facebook Groups

- V1 does not scrape Facebook groups.
- Do not store or share Facebook credentials.
- Do not bypass login, group membership, robots controls, rate limits, or anti-automation protections.
- Do not automate seller contact or message sending.
- Future Facebook-related work requires documented permission or an official supported API path before ingestion is enabled.

## Marketplace Integrations

Future marketplace adapters must document:

- Whether the source has an official API.
- Allowed request rates and pagination behavior.
- Whether listing content, images, and source URLs can be stored.
- Required attribution or source links.
- Takedown and deletion handling.
- Retention limits for raw text and normalized records.

## Retention Rules

- Sample records can be stored indefinitely in the repository.
- Manual demo text should be treated as transient unless the user explicitly saves it.
- Future approved source records should store only fields required for deal scoring, freshness, dedupe, and traceability.
- Raw source text should have a shorter retention period than normalized listing metadata.

## Privacy Rules

- Do not store personal phone numbers, private profile data, private messages, or hidden group metadata.
- Do not infer sensitive user attributes from posts.
- Prefer source names and source URLs over seller identities.
- Redact secrets and access tokens from logs and traces.

## Demo Verification

Every demo source should be one of:

- `sample`
- `manual`
- `approved`

The default local stack runs with `STRICT_SOURCE_POLICY=false` for easy demos. CI and stricter integration tests should run at least one pass with `STRICT_SOURCE_POLICY=true`.
