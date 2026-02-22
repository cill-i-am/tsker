# tsker

This repository contains an Effect-based API, a TanStack Start web frontend, and
an Hono-based auth service, and shared tooling/data packages.

## Workspace layout

- `apps/api`: Effect-based API service
- `apps/auth`: Better Auth service on Hono
- `apps/web`: TanStack Start frontend
- `packages/db`: Postgres + Drizzle + Effect SQL integration
- `packages/typescript-config`: shared TypeScript configuration

## Commands

From the repository root:

- `pnpm dev` – one-command local setup:
  starts Docker Postgres, runs DB migrations, then runs app dev servers
  through Portless with stable `*.localhost` hostnames
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
```

Default Portless dev URLs:

- Web: `http://app.tsker.localhost:1355`
- API: `http://api.tsker.localhost:1355`
- Auth: `http://auth.tsker.localhost:1355`

## Database environments

- Local development uses Docker Postgres from `docker-compose.yml`.
- Production should provide `DATABASE_URL` via environment (for example,
  PlanetScale Postgres or an equivalent managed PostgreSQL provider).
- Local defaults live in `.env.example`.
- Override local defaults in `.env` or `.env.local` (both are loaded by
  `scripts/dev.sh`), for example `DATABASE_URL`, `BETTER_AUTH_URL`,
  `AUTH_TRUSTED_ORIGINS`, `VITE_API_URL`, `VITE_AUTH_URL`.
- Portless is installed as a root dev dependency and is available after
  `pnpm install`.
