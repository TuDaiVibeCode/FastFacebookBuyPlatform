# Repository Guidelines

## Project Structure & Module Organization

Current repository contains planning documents for Deal Radar:

- `DEAL_RADAR_PLAN.md` - detailed architecture and implementation notes.
- `marketplace-deal-platform-plan.md` - high-level marketplace task list.
- `COMPLETE_PLAN.md` - merged execution plan and current source of truth.

Backend application code should stay inside `backend/`:

- `backend/apps/api/` for FastAPI backend code and tests.
- `backend/packages/sample-data/` for demo posts and market prices.
- `backend/docs/` for architecture, source policy, and demo docs.
- `backend/infra/docker/` for Docker Compose and Dockerfiles.

## Build, Test, and Development Commands

No runnable app exists yet. Until scaffolding lands, validate docs with lightweight checks:

- `rg --files -g '*.md'` - list markdown files.
- `sed -n '1,120p' COMPLETE_PLAN.md` - review main plan.
- `git status --short` - inspect pending changes.

Once app code is added, document exact commands in `backend/README.md` and keep this file updated. Expected examples include `docker compose -f backend/infra/docker/docker-compose.yml up` and backend tests from `apps/api/`.

## Coding Style & Naming Conventions

Keep markdown concise, with descriptive headings and actionable bullets. Use ASCII unless existing files require Vietnamese text examples. Name documentation files in uppercase only for repository-level guides such as `README.md` and `AGENTS.md`; use kebab-case or clear uppercase plan names consistently.

For future code, follow local framework defaults: Python formatting for FastAPI, TypeScript conventions for Next.js and React Native, and module names matching `COMPLETE_PLAN.md`.

## Testing Guidelines

Planning changes should be reviewed for consistency against `COMPLETE_PLAN.md`. When implementation begins, add tests beside the API:

- `backend/apps/api/tests/` for backend unit and integration tests.

Cover cache behavior, analyze flow, verdict rules, and demo-critical paths first.

## Commit & Pull Request Guidelines

Git history currently uses short imperative subjects such as `Plan` and `Add files via upload`. Prefer concise imperative commit messages, for example `Add complete implementation plan`.

Pull requests should include purpose, key changed files, verification performed, and screenshots when UI changes exist. Link related issues when available. Do not mix unrelated planning, backend, web, and mobile changes unless one feature requires them.

## Security & Configuration Tips

Do not commit secrets or real marketplace credentials. Keep API keys in `.env` files ignored by Git. V1 should rely on sample data and documented source policy, not live Facebook scraping.
