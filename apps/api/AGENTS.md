# AGENTS.md

Operational guidance for coding agents working in `apps/api`.

Use this file for API-specific implementation details. Read root `AGENTS.md` first for cross-repo conventions.

## 1. Scope

- Primary focus: deliver safe, minimal, high-signal changes to `apps/api`.
- Keep this app focused on business/feature API routes. Auth routes are owned by `apps/auth`.

## 2. Stack and Entry Points

- Stack: Effect (`effect`, `@effect/platform`, `@effect/platform-node`) + Vitest + TypeScript (ESM).
- Runtime entrypoint: `src/index.ts`.
- Server composition: `src/server.ts`.

## 3. Commands That Work

From repo root:

```bash
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api type-check
pnpm --filter api build
```

From app directory:

```bash
cd apps/api
pnpm dev
pnpm test
pnpm type-check
pnpm build
```

## 4. Architecture Map

### Request flow

1. `src/index.ts` launches `makeServerLayer()`.
2. `src/server.ts` composes:
   - config layer (`AppConfigService`)
   - HTTP API (`HttpLayerRouter.addHttpApi(Api)`)
   - handlers layer (`HandlersLive`)
   - optional Swagger docs layer (`/docs` for `local` or `staging`)
   - Node HTTP server layer bound to configured `PORT`
3. Route definitions live in feature API groups (currently `/up`).
4. Handler implementations return Effect values and are wired through `HttpApiBuilder.group(...)`.

### File responsibilities

- `src/api/api.ts`: top-level API aggregation.
- `src/api/handlers.ts`: route handler wiring.
- `src/features/health/health-api.ts`: endpoint contracts and response schema.
- `src/features/health/health-handlers.ts`: endpoint implementations.
- `src/config/app-config.ts`: env schema with defaults.
- `src/config/app-config-service.ts`: config loading service and provider helpers.
- `src/errors/config-load-error.ts`: config error type.
- `src/app.test.ts`: endpoint behavior tests.
- `src/config/config.test.ts`: config decode tests.

## 5. API Coding Rules

### Do

- Keep endpoint contracts in `*-api.ts` and behavior in `*-handlers.ts`.
- Define request/response contracts with `Schema`.
- Keep config parsing centralized in `AppConfigFromEnv`.
- Preserve `.js` import specifiers in TypeScript source (ESM output expectation).

### Do not

- Bypass `AppConfigService` by reading `process.env` directly inside handlers.
- Mix route definitions and business logic in the same file.
- Add broad framework refactors when implementing a single endpoint.
- Enable docs in production unless explicitly requested.

## 6. Environment and Runtime Guardrails

- `apps/api/package.json` requires Node `>=22.0.0`.
- Config defaults:
  - `PORT=3002`
  - `APP_ENV=local`
  - `LOG_LEVEL=info`
- Swagger docs:
  - exposed at `/docs` only for `APP_ENV=local|staging`
  - must return `404` in production

## 7. Verification Standard (Before Claiming Done)

Always run:

```bash
pnpm --filter api test
pnpm --filter api type-check
```

If build/output touched:

```bash
pnpm --filter api build
```

Report exactly what was run and whether it passed.
