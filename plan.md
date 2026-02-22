# Better Auth Integration Orchestrator Plan

## Stage Gates
- [x] Gate 0: Orchestration setup (integration branch, worktrees, control plane)
- [ ] Gate 1: Shared contracts + route/auth config skeleton
- [ ] Gate 2: Organization DB schema + migration baseline

## Lanes
- [ ] lane-auth-client-web
- [ ] lane-auth-ui-web
- [ ] lane-auth-server-hardening
- [ ] lane-org-db
- [ ] lane-org-server
- [ ] lane-org-web
- [ ] lane-test-hardening

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
- [ ] Gate 1 verification
- [ ] Gate 2 verification
- [ ] Wave A verification
- [ ] Wave B verification
- [ ] Final integration verification

## Merge Queue (cherry-pick into codex/better-auth-integration)
1. lane-auth-server-hardening
2. lane-auth-client-web
3. lane-auth-ui-web
4. lane-test-hardening (Wave A)
5. lane-org-db
6. lane-org-server
7. lane-org-web
8. lane-test-hardening (Wave B)
