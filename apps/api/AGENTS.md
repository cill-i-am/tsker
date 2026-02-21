# AGENTS.md

Operational guidance for coding agents working in `apps/api`.

Use this file for API-specific implementation details. Read root `AGENTS.md` first for cross-repo conventions.

## 1. Scope

- Primary focus: deliver safe, minimal, high-signal changes to `apps/api`.
- Prefer explicit behavior and straightforward code over abstraction.

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

1. `src/index.ts` launches `makeServerLayer()` via `Layer.launch(...).pipe(NodeRuntime.runMain)`.
2. `src/server.ts` composes:
   - config layer (`AppConfigService`)
   - HTTP API (`HttpApiBuilder.api(Api)`)
   - handlers layer (`HandlersLive`)
   - optional Swagger docs layer (`/docs` for `local` or `staging`)
   - Node HTTP server layer bound to configured `PORT`
3. Route definitions live in feature API groups (`/up`) and Better Auth routes (`/api/auth/*`).
4. Handler implementations return Effect values and are wired through `HttpApiBuilder.group(...)`.

### File responsibilities

- `src/api/Api.ts`: top-level API aggregation.
- `src/api/Handlers.ts`: route handler wiring.
- `src/features/health/HealthApi.ts`: endpoint contracts and response schema.
- `src/features/health/HealthHandlers.ts`: endpoint implementations.
- `src/config/AppConfig.ts`: env schema with defaults.
- `src/config/AppConfigService.ts`: config loading service and provider helpers.
- `src/auth/auth.ts`: Better Auth instance construction and adapter wiring.
- `src/auth/AuthService.ts`: Effect service wrapper around Better Auth handler + session access.
- `src/errors.ts`: domain/config tagged errors.
- `src/app.test.ts`: endpoint behavior tests.
- `src/config/config.test.ts`: config decode tests.

## 5. API Coding Rules

### Do

- Keep endpoint contracts in `*Api.ts` and behavior in `*Handlers.ts`.
- Define request/response contracts with `Schema`.
- Keep config parsing centralized in `AppConfigFromEnv`.
- Return typed domain errors (tagged errors) instead of ad hoc throw strings.
- Preserve `.js` import specifiers in TypeScript source (ESM output expectation).

### Do not

- Bypass `AppConfigService` by reading `process.env` directly inside handlers.
- Mix route definitions and business logic in the same file.
- Add broad framework refactors when implementing a single endpoint.
- Enable docs in production unless explicitly requested.

## 6. Environment and Runtime Guardrails

- `apps/api/package.json` requires Node `>=22.0.0` (repo root is `>=18`, API is stricter).
- Config defaults:
  - `PORT=3002`
  - `APP_ENV=local`
  - `LOG_LEVEL=info`
- Required auth/db config:
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `AUTH_TRUSTED_ORIGINS`
  - `AUTH_COOKIE_DOMAIN`
- Swagger docs:
  - exposed at `/docs` only for `APP_ENV=local|staging`
  - must return `404` in production

## 7. Change Playbooks

### Add a new endpoint

1. Add schema + endpoint in relevant feature `*Api.ts`.
2. Implement Effect handler in feature `*Handlers.ts`.
3. Wire handler in `src/api/Handlers.ts`.
4. Ensure feature group is included from `src/api/Api.ts`.
5. Add/extend tests in `src/app.test.ts`.
6. Run `pnpm --filter api test && pnpm --filter api type-check`.

### Add config values

1. Extend `AppConfigFromEnv` in `src/config/AppConfig.ts`.
2. Ensure service access remains through `AppConfigService`.
3. Add tests for default + invalid decode in `src/config/config.test.ts`.
4. Run `pnpm --filter api test && pnpm --filter api type-check`.

## 8. Verification Standard (Before Claiming Done)

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

## 9. Definition of Done

- Behavior change implemented with matching tests.
- No TypeScript errors in affected scope.
- No hidden config regressions (defaults/invalid values covered).
- Docs exposure behavior preserved (`/docs` env gating).
- Diff remains focused on requested scope.
