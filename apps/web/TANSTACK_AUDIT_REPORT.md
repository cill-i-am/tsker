# TanStack Router/Start/Query Best-Practice Audit

Date: 2026-02-22
Scope: `apps/web`

## Method

Reviewed the current implementation against repository skill guides:

- `.agents/skills/tanstack-router-best-practices`
- `.agents/skills/tanstack-start-best-practices`
- `.agents/skills/tanstack-query-best-practices`

And inspected application code in:

- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/protected.tsx`
- `src/components/home-page.tsx`
- `src/lib/auth-client.ts`
- `src/lib/auth-api.ts`

---

## Executive Summary

The app follows several core TanStack Router + Start patterns (typed router registration, file-based routes, loader usage, `defaultPreload: "intent"`, and server function usage). However, it is currently **only partially aligned** with best practices because:

1. Query integration is not set up despite `@tanstack/react-router-ssr-query` being installed.
2. Auth protection is implemented as an informational session check rather than route-level access control.
3. Route-level code splitting and global router error/not-found boundaries are missing.
4. One route uses `useLoaderData({ from: ... })` instead of route-local hook helpers.

---

## Findings

## ✅ What is already good

### 1) Router defaults include intent preloading + scroll restoration

`src/router.tsx` sets:

- `defaultPreload: "intent"`
- `defaultPreloadStaleTime: 0`
- `scrollRestoration: true`

This is aligned with Router guidance for responsive navigation and (potential) Query freshness control.

### 2) Router type registration is in place

`src/router.tsx` correctly augments TanStack Router `Register` with `router: ReturnType<typeof getRouter>`, enabling route-level inference.

### 3) File-based routes and route loader are used

Routes are implemented via `createFileRoute`, and `/protected` uses a loader that calls a server function.

### 4) Start server function is used for server-only request handling

`src/routes/protected.tsx` uses `createServerFn` with `getRequestHeaders()` and forwards cookies/origin to API calls. This is a good Start pattern for SSR-aware authenticated requests.

### 5) Navigation uses `Link` instead of imperative full reloads

The header and pages consistently use TanStack Router `Link`.

---

## ⚠️ Gaps vs best practice (highest value first)

### 1) Missing TanStack Query integration (high)

Although the app depends on `@tanstack/react-router-ssr-query`, there is no `QueryClient` setup, no router-query integration, and no SSR dehydration/hydration pattern.

Impact:

- No unified server-state cache strategy.
- Missed opportunity for loader-prefetch + component-level query reuse.
- Harder to scale data fetching consistency and invalidation.

Recommendation:

- Add `@tanstack/react-query` and initialize a per-request `QueryClient`.
- Wire router integration (`setupRouterSsrQueryIntegration`) and route loaders with `ensureQueryData`.
- Move API/session fetching to query options factories where practical.

### 2) Protected route does not actually protect access (high)

`/protected` currently reports auth state but does not redirect unauthenticated users.

Impact:

- Route name implies access control but behavior is diagnostic-only.
- Security/UX mismatch.

Recommendation:

- Add `beforeLoad` auth guard (or a pathless protected layout route).
- Redirect to sign-in (with return URL) when session is absent.

### 3) No global `defaultErrorComponent` / `defaultNotFoundComponent` (medium)

Router defaults currently omit custom catch/not-found boundaries.

Impact:

- Inconsistent user-facing error UX.
- Less control over recoverability and diagnostics.

Recommendation:

- Add root-level reusable `DefaultCatchBoundary` and `DefaultNotFound` components in router config.

### 4) Route components are not lazily split (medium)

Only main route files are used (`index.tsx`, `protected.tsx`). No `.lazy.tsx` route-component split is used.

Impact:

- Larger initial route bundles as app grows.

Recommendation:

- Keep critical route config in route files, move heavy components to `*.lazy.tsx`.

### 5) `useLoaderData({ from: "/protected" })` can be simplified (low)

In `/protected`, data is read with generic `useLoaderData({ from: ... })` instead of route-local `Route.useLoaderData()`.

Impact:

- Slightly noisier API, weaker local refactor ergonomics.

Recommendation:

- Replace with `const data = Route.useLoaderData()`.

### 6) Server function lacks explicit input validation pattern (low/medium)

Current server function has no inputs, so this is not a bug today. But for future server functions, shared validation schemas (zod or similar) should be standard.

Recommendation:

- Adopt `.functions.ts` + schema validation for any server function that accepts input.

---

## Suggested remediation plan

1. **Introduce Query foundation first**
   - Add `QueryClient` provider + SSR query integration.
   - Define session query options factory.
2. **Enforce auth at routing layer**
   - Add `beforeLoad` redirect for protected routes or protected layout grouping.
3. **Harden router UX**
   - Add default error/not-found components.
4. **Optimize route delivery**
   - Add lazy route component splits for non-trivial pages.

---

## Overall assessment

Current maturity for TanStack stack best practices in `apps/web`:

- **Router**: Good baseline, missing several recommended production hardening features.
- **Start**: Correct basic server function usage, but route-protection patterns need to be formalized.
- **Query**: Largely not adopted yet despite partial dependency footprint.

**Score (pragmatic): 6.5 / 10** — clean foundation, but key scaling patterns (query integration + auth route guards + error boundaries) should be implemented next.
