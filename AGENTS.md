# AGENTS.md

Operational guidance for coding agents working in this repository.

This file is intentionally specific to the current codebase and should be treated as a living document.

## 1. Mission and Scope

- Deliver safe, minimal, high-signal changes in this monorepo.
- Keep changes local to the app/package you touch. Do not refactor unrelated projects unless required.
- Prefer explicit behavior and straightforward code over abstraction.

## 2. Repo Snapshot (Current Reality)

- Monorepo: Turborepo + pnpm workspaces.
- Root apps: `apps/api`, `apps/auth`, `apps/web`.
- Shared packages: `packages/db`, `packages/typescript-config`.

## 3. Instruction Hierarchy

- Start with this root file for cross-repo conventions.
- Then read the closest app/package `AGENTS.md` before making scoped changes.
- API-specific rules live in `apps/api/AGENTS.md`.
- Auth-specific rules live in `apps/auth/AGENTS.md`.

## 4. Commands That Work

Run from repo root unless noted.

### Monorepo loop

```bash
pnpm dev
pnpm dev:apps
pnpm lint
pnpm fix
pnpm test
pnpm check-types
pnpm build
```

Notes:

- `pnpm dev` uses workspace-installed `portless` from root devDependencies.
- `pnpm dev` expects Bash 4+ because `scripts/dev.sh` uses associative arrays (`declare -A`); on macOS use Homebrew Bash (`/opt/homebrew/bin/bash`) instead of the default `/bin/bash` 3.2.
- `pnpm dev` loads defaults from `.env.example`, then overrides from `.env` and `.env.local`.
- Shell-exported env vars override `.env*` values during `pnpm dev`.

### Local database

```bash
pnpm db:up
pnpm db:down
pnpm db:reset
pnpm db:studio
```

### Scoped (preferred for focused changes)

```bash
pnpm --filter <project> dev
pnpm --filter <project> test
pnpm --filter <project> type-check
pnpm --filter <project> build
```

Example for API:

```bash
pnpm --filter api test
pnpm --filter api type-check
pnpm --filter api build
```

Example for Auth:

```bash
pnpm --filter auth test
pnpm --filter auth type-check
pnpm --filter auth build
```

Example for Web e2e:

```bash
pnpm --filter web test:e2e
```

## 5. Verification Standard (Before Claiming Done)

- Always run tests + type checks for the project you changed.
- Prefer scoped commands (`--filter`) instead of whole-repo runs unless cross-project changes require it.
- Report exactly what was run and whether it passed.

## 6. Definition of Done

- Behavior change implemented with matching tests.
- No TypeScript errors in affected scope.
- Diff remains focused on requested scope.

## 7. Keep This File Healthy (Self-Improving Rule)

When you learn a stable, non-trivial repo fact during task execution, update this file in the same change if it improves future agent accuracy. Keep updates concise and factual:

- Add verified commands only.
- Remove outdated instructions immediately.
- Prefer concrete file paths and examples over generic advice.

## 8. Ultracite Standards

This repository uses **Ultracite** with the **Oxlint + Oxfmt** provider.

### Quick reference

```bash
pnpm exec ultracite check
pnpm exec ultracite fix
pnpm exec ultracite doctor
```

### Coding expectations

- Favor explicit and type-safe TypeScript.
- Keep functions focused and readable; avoid unnecessary abstractions.
- Prefer modern JavaScript patterns (`const`, `for...of`, optional chaining, template literals).
- Handle async flows with `async/await` and explicit error handling.
- Keep React markup semantic and accessible.
- Remove debug artifacts (`console.log`, `debugger`) from production paths.
- Trust formatter-driven ordering for imports and Tailwind classes.
- Buildable workspace packages under `packages/*` should use `tsdown` for bundling.
