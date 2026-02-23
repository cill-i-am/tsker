# Better Auth Integration Orchestrator Plan

## Stage Gates
- [x] Gate 0: Orchestration setup (integration branch, worktrees, control plane)
- [x] Gate 1: Shared contracts + route/auth config skeleton
- [x] Gate 2: Organization DB schema + migration baseline

## Lanes
- [x] lane-auth-client-web
- [x] lane-auth-ui-web
- [x] lane-auth-server-hardening
- [x] lane-org-db
- [x] lane-org-server
- [x] lane-org-web
- [x] lane-test-hardening

## File Ownership Locks
- lane-auth-client-web:
  - apps/web/src/lib/auth-client.ts
  - apps/web/src/lib/auth-api.ts (decommission)
  - apps/web/src/lib/auth-hooks.ts (new)
- lane-auth-ui-web:
  - apps/web/src/routes/_auth.tsx
  - apps/web/src/routes/_auth.login.tsx
  - apps/web/src/routes/_auth.signup.tsx
  - apps/web/src/routes/_auth.forgot-password.tsx
  - apps/web/src/routes/_auth.reset-password.tsx
  - apps/web/src/routes/onboarding.tsx
  - apps/web/src/components/auth/*
- lane-auth-server-hardening:
  - apps/auth/src/auth/auth.ts
  - apps/auth/src/config/app-config.ts
  - apps/auth/src/config/config.test.ts
  - apps/auth/src/app.test.ts
- lane-org-db:
  - packages/db/src/schema.ts
  - packages/db/drizzle/*
- lane-org-server:
  - apps/auth/src/auth/auth.ts
  - apps/auth/src/app.test.ts
- lane-org-web:
  - apps/web/src/routes/org.$slug.tsx
  - apps/web/src/routes/org.$slug.index.tsx
  - apps/web/src/routes/onboarding.tsx
- lane-test-hardening:
  - apps/web/e2e/sign-in-flow.spec.ts
  - apps/web/src/lib/*.test.ts
  - apps/auth/src/app.test.ts

## Dependencies
- lane-auth-client-web depends on: Gate 1
- lane-auth-ui-web depends on: Gate 1
- lane-auth-server-hardening depends on: Gate 1
- lane-org-db depends on: Gate 2
- lane-org-server depends on: Gate 2
- lane-org-web depends on: Gate 2
- lane-test-hardening depends on: Gate 1 (Wave A), Gate 2 (org coverage)

## Shared Contracts
### Routing
- Pathless auth layout: `_auth.tsx`
- Public auth URLs: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Holding route: `/onboarding`
- Org route namespace: `/org/:slug/*`

### Auth Client Contract
- Web client auth actions must go through Better Auth client methods.
- Decommission custom fetch mutation helper from `apps/web/src/lib/auth-api.ts`.

### Auth Server Contract
- Add reset-password and email-verification delivery handlers.
- Require verified email for access to protected routes.
- Add rate limiting config.
- Environment strategy:
  - production: Resend provider
  - local/test: log callback URLs (non-delivery fallback)

## Verification Log
- [x] Worktree creation and branch wiring completed.
- [x] Gate 1 verification
- [x] Gate 2 verification
- [x] Wave A verification
- [x] Wave B verification
- [x] Final integration verification
- [x] Post-integration hardening verification (auth-first root routing + e2e stabilization)
- [x] Temporary lint suppression removal verification (`apps/web` + `apps/auth` lint/type-check clean without manual suppressions)
- [x] CI e2e stabilization verification (forgot-password success state + tolerant `/login` URL assertion)

### Lane Execution Log
- [x] lane-auth-server-hardening merged via `843939e`
  - branch commit: `5c8e88d969731d0f2a186d27ec2b1a158acce65d`
  - checks: `pnpm --filter auth test` (pass), `pnpm --filter auth type-check` (pass)
- [x] lane-auth-ui-web merged via `444c3f6`
  - branch commit: `752c7788c004605fcc8e9232620c71b2a1776f89`
  - checks: `pnpm --filter web test` (pass), `pnpm --filter web type-check` (pass)
- [x] lane-auth-client-web merged via `45f3365`
  - branch commit: `d5bf369`
  - checks: `pnpm --filter web test` (pass), `pnpm --filter web type-check` (pass)
- [x] lane-org-db merged via `6000201`
  - branch commit: `c5eef82`
  - checks: `pnpm --filter @repo/db build` (pass), `pnpm --filter @repo/db type-check` (pass)
- [x] lane-org-server merged via `6da804d`
  - branch commit: `b6bdfb01794dc08d3256e6dc751fd6b534bf9d11`
  - checks: `pnpm --filter auth test` (pass), `pnpm --filter auth type-check` (pass)
- [x] lane-org-web merged via `19ec5d5`
  - branch commit: `8087c2c1c2dd5901790bea99fe9a7a7a26ba61cd`
  - checks: `pnpm --filter web test` (pass), `pnpm --filter web type-check` (pass)
- [x] lane-test-hardening merged via `d66222e`
  - branch commit: `c9a65b2417fe3f70a7cad1435c1a4c32609c6306`
  - checks: `pnpm --filter auth test` (pass), `pnpm --filter web test` (pass), `pnpm --filter web type-check` (pass)

### Final Integration Run
- [x] `pnpm --filter auth test && pnpm --filter auth type-check` (pass)
- [x] `pnpm --filter web test && pnpm --filter web type-check` (pass)
- [x] `pnpm --filter web test:e2e` (pass after aligning auth verification expectations in e2e assertions)
- [x] `pnpm --filter @repo/db build && pnpm --filter @repo/db type-check` (pass)

### Post-Integration Hardening Run
- [x] `pnpm --filter web test` (pass)
- [x] `pnpm --filter web type-check` (pass)
- [x] `pnpm --filter web test:e2e` (pass)

### Lint Suppression Cleanup Run
- [x] `pnpm --filter auth lint` (pass)
- [x] `pnpm --filter auth type-check` (pass)
- [x] `pnpm --filter web lint` (pass)
- [x] `pnpm --filter web type-check` (pass)
- [x] `pnpm lint` (pass)

### CI Auth DB Test Stabilization (Email Verification Aware)
- [x] Root-cause confirmed from CI logs: `sign-up/email` no longer sets session cookie when email verification is required.
- [x] Updated auth DB tests to verify user email and then sign in before asserting cookie/session-dependent behavior.
- [x] `RUN_DB_TESTS=true pnpm --filter auth test` (pass)

### CI Web E2E Stabilization (Sign-In Flow)
- [x] Root-cause confirmed from CI logs: strict `/login$` assertion failed on `/login?`, and forgot-password status assertion was flaky in CI timing.
- [x] Updated `apps/web/e2e/sign-in-flow.spec.ts`:
  - tolerate `/login` and `/login?query` via regex
  - add resilient forgot-password submit helper with retry/wait
- [x] Updated `apps/web/src/routes/_auth.forgot-password.tsx`:
  - show user-safe success status immediately after submit
  - execute reset request in background without exposing account existence
- [x] `CI=true pnpm --filter web test:e2e` (pass)
- [x] `CI=true pnpm --filter web exec playwright test e2e/sign-in-flow.spec.ts --repeat-each=12 --workers=1` (pass)

## Merge Queue (cherry-pick into codex/better-auth-integration)
1. lane-auth-server-hardening
2. lane-auth-client-web
3. lane-auth-ui-web
4. lane-test-hardening (Wave A)
5. lane-org-db
6. lane-org-server
7. lane-org-web
8. lane-test-hardening (Wave B)
