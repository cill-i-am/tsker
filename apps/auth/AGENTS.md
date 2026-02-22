# AGENTS.md

Operational guidance for coding agents working in `apps/auth`.

Use this file for auth-service-specific implementation details. Read root `AGENTS.md` first for cross-repo conventions.

## 1. Scope

- Primary focus: deliver safe, minimal, high-signal changes to `apps/auth`.
- Keep this app focused on Better Auth routes and auth health checks.

## 2. Stack and Entry Points

- Stack: Hono + Better Auth + Effect Config + Vitest + TypeScript (ESM).
- Runtime entrypoint: `src/index.ts`.
- Server composition: `src/server.ts`.

## 3. Commands That Work

From repo root:

```bash
pnpm --filter auth dev
pnpm --filter auth test
pnpm --filter auth type-check
pnpm --filter auth build
```

From app directory:

```bash
cd apps/auth
pnpm dev
pnpm test
pnpm type-check
pnpm build
```

## 4. Architecture Map

### Request flow

1. `src/index.ts` exports runtime functions from `src/server.ts`.
2. `src/server.ts` loads env config via `AppConfigService`, constructs Better Auth, and mounts `/api/auth` + `/api/auth/*` on Hono.
3. CORS and trusted-origin checks are enforced before forwarding to the Better Auth web handler.
4. `/up` returns service health metadata for orchestration and probes.

### File responsibilities

- `src/auth/auth.ts`: Better Auth instance construction and Drizzle adapter wiring.
- `src/config/app-config.ts`: env schema with defaults.
- `src/config/app-config-service.ts`: config loading service and provider helpers.
- `src/server.ts`: Hono route setup + CORS guardrails + runtime lifecycle.
- `src/app.test.ts`: endpoint behavior tests.
- `src/config/config.test.ts`: config decode tests.

## 5. Environment and Runtime Guardrails

- `apps/auth/package.json` requires Node `>=22.0.0`.
- Config defaults:
  - `PORT=3003` (usually set from `AUTH_PORT` in scripts)
  - `APP_ENV=local`
  - `LOG_LEVEL=info`
- Required auth/db config:
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `AUTH_TRUSTED_ORIGINS`
  - `AUTH_COOKIE_DOMAIN`

## 6. Verification Standard (Before Claiming Done)

Always run:

```bash
pnpm --filter auth test
pnpm --filter auth type-check
```

If build/output touched:

```bash
pnpm --filter auth build
```

Report exactly what was run and whether it passed.
