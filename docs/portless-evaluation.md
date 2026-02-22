# Portless Evaluation for `tsker` Monorepo

## Recommendation

Adopt [`vercel-labs/portless`](https://github.com/vercel-labs/portless) for local development as an **opt-in first step**, then make it the default if the team validates it over a short trial.

It is likely valuable in this repo because we currently depend on fixed ports and custom `*.localtest.me` hostnames for auth/cookies, which is a source of environment drift and brittle local setup.

## Why it is a good fit here

- The repo runs multiple services in local dev (`apps/web` + `apps/api`), so stable named hosts reduce "which port is running what" friction.
- Local auth already uses hostnames (`app.localtest.me`, `api.localtest.me`) and cookie domain configuration, so moving to named `.localhost` hosts matches the existing mental model.
- `portless` can wrap Vite and Node-based API commands and inject host/port wiring without forcing static port allocation.

## Current constraints in this monorepo

Before integrating `portless`, these repo-specific assumptions need to be generalized:

1. **Hardcoded localtest hosts/ports** in scripts and source defaults.
2. **Strict host allow-list** in Vite (`allowedHosts` currently tied to `app.localtest.me`).
3. **Request-origin allow logic** in web only trusts `localhost` and `*.localtest.me`.
4. **E2E config defaults** assume `app.localtest.me:3000` and `api.localtest.me:3002`.

## Proposed implementation plan

### Phase 0 — Trial (no workflow breakage)

1. Add `portless` as a devDependency at workspace root.
2. Add parallel scripts (do not replace existing scripts yet):
   - `dev:apps:portless`
   - `dev:web:portless`
   - `dev:api:portless`
3. Keep existing `pnpm dev` untouched for now.

### Phase 1 — Make host handling configurable

1. Introduce central env defaults in `scripts/dev.sh`:
   - `WEB_ORIGIN` (default `http://app.localtest.me:3000`)
   - `API_ORIGIN` (default `http://api.localtest.me:3002`)
2. Derive:
   - `BETTER_AUTH_URL` from `API_ORIGIN`
   - `AUTH_TRUSTED_ORIGINS` from `WEB_ORIGIN`
   - `VITE_API_URL` from `API_ORIGIN`
3. Document equivalent `.localhost:1355` values for portless mode.

### Phase 2 — Web host compatibility

1. Update `apps/web/vite.config.ts` host allow-list to accept both:
   - existing `app.localtest.me`
   - `*.localhost` (or make it env-driven)
2. Update `apps/web/src/lib/request-origin.ts` to trust:
   - `localhost`
   - `*.localtest.me`
   - `*.localhost`
3. Expand unit tests in `request-origin.test.ts` to cover `app.localhost` cases.

### Phase 3 — Portless scripts + docs

1. Add scripts such as:
   - root: `dev:portless` (starts DB + runs apps through portless names)
   - web: `dev:portless` -> `portless app pnpm run dev`
   - api: `dev:portless` -> `portless api pnpm run dev`
2. Add quickstart docs:
   - install + start proxy
   - expected URLs (`http://app.localhost:1355`, `http://api.localhost:1355`)
   - troubleshooting (proxy running, stale routes, HTTPS trust step)

### Phase 4 — E2E and CI policy

1. Keep CI and Playwright defaults on deterministic ports initially.
2. Add optional local E2E path for portless (developer-only) if desired.
3. Decide team policy after trial:
   - Option A: keep portless optional.
   - Option B: make portless default and retain `PORTLESS=0` escape hatch.

## Risks and mitigations

- **Cookie/domain behavior differences (`.localtest.me` vs `.localhost`)**
  - Mitigation: test login/session flows in Chrome + Firefox before flipping defaults.
- **Tooling expectations around fixed ports**
  - Mitigation: maintain non-portless scripts during rollout.
- **Developer machine trust prompts for HTTPS mode**
  - Mitigation: keep HTTP mode as baseline; document HTTPS as optional.

## Success criteria for adoption

- New contributors can run local apps without resolving port conflicts manually.
- Auth flows remain stable across reloads/restarts.
- E2E remains green on existing fixed-port path.
- Team reports lower local setup/debug friction after one sprint trial.
