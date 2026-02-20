# AGENTS.md

Operational guidance for coding agents working in this repository.

This file is intentionally specific to the current codebase and should be treated as a living document.

## 1. Mission and Scope

- Deliver safe, minimal, high-signal changes in this monorepo.
- Keep changes local to the app/package you touch. Do not refactor unrelated projects unless required.
- Prefer explicit behavior and straightforward code over abstraction.

## 2. Repo Snapshot (Current Reality)

- Monorepo: Turborepo + pnpm workspaces.
- Root apps: `apps/api`, `apps/web`, `apps/docs`.
- Shared packages: `packages/ui`, `packages/eslint-config`, `packages/typescript-config`.

## 3. Instruction Hierarchy

- Start with this root file for cross-repo conventions.
- Then read the closest app/package `AGENTS.md` before making scoped changes.
- API-specific rules live in `apps/api/AGENTS.md`.

## 4. Commands That Work

Run from repo root unless noted.

### Monorepo loop

```bash
pnpm dev
pnpm test
pnpm check-types
pnpm build
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
