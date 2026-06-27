# Deal Radar Landing Page

Landing page folder is reserved for public marketing page / static entry point.

Current status:

- Backend and core app sections are implemented in:
  - `frontend/` (web app)
  - `mobile/` (expo app)
  - `backend/` (FastAPI + PostgreSQL/Redis/Chroma)
- A lightweight landing entry point can be added in `landing/` using Next.js or Astro.

Planned usage:

- `landing/` should be wired to `backend` APIs through a public-facing API URL.
- Keep marketing assets and campaign copy separated from app shells.
- Keep auth pages reachable from landing to direct users to `/auth/login`.

Reference environment:

- Public API base for landing: `http://localhost:18000`
- If deployed, point to gateway/base URL with `/api/v1`.
