# tsker

This repository contains an Effect-based API, a TanStack Start web frontend, and
shared tooling/data packages.

## Workspace layout

- `apps/api`: Effect-based API service
- `apps/web`: TanStack Start frontend
- `packages/db`: Postgres + Drizzle + Effect SQL integration
- `packages/typescript-config`: shared TypeScript configuration

## Commands

From the repository root:

- `pnpm dev` – one-command local setup:
  starts Docker Postgres, runs DB migrations, then runs app dev servers
  through `portless` with stable URLs if env vars are unset
- `pnpm dev:apps` – run only app development tasks through Turborepo
- `pnpm db:up` / `pnpm db:down` / `pnpm db:reset` – manage local Docker Postgres
- `pnpm db:studio` – start Drizzle Studio for local DB inspection
- `pnpm build` – build workspace projects
- `pnpm lint` – run linting tasks
- `pnpm fix` – run Ultracite auto-fixes
- `pnpm format` – alias for `pnpm fix`
- `pnpm exec ultracite check` – run Ultracite checks directly
- `pnpm exec ultracite doctor` – diagnose Ultracite setup
- `pnpm check-types` – run TypeScript checks
- `pnpm test` – run test tasks

To run only the API app locally:

```sh
pnpm --filter api dev

# Starts at http://api.localhost:1355
```

To run only the Web app locally:

```sh
pnpm --filter web dev

# Starts at http://app.localhost:1355
```

## Portless local URLs

- Web: `http://app.localhost:1355`
- API: `http://api.localhost:1355`

Set `PORTLESS=0` to bypass `portless` and run direct dev commands.

For Playwright e2e, URL targets are controlled separately via `E2E_WEB_URL` and
`E2E_API_URL` (CI defaults use `*.localtest.me`).

## Database environments

- Local development uses Docker Postgres from `docker-compose.yml`.
- Production should provide `DATABASE_URL` via environment (for example,
  PlanetScale Postgres or an equivalent managed PostgreSQL provider).
- You can override any local defaults by exporting env vars before `pnpm dev`
  (for example `DATABASE_URL`, `BETTER_AUTH_URL`, `AUTH_TRUSTED_ORIGINS`).
