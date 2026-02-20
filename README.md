# tsker

This repository now contains only the API application and shared tooling packages.

## Workspace layout

- `apps/api`: Effect-based API service
- `packages/eslint-config`: shared ESLint configuration
- `packages/typescript-config`: shared TypeScript configuration

## Commands

From the repository root:

- `pnpm dev` – run development tasks through Turborepo
- `pnpm build` – build workspace projects
- `pnpm lint` – run linting tasks
- `pnpm check-types` – run TypeScript checks
- `pnpm test` – run test tasks

To run only the API app locally:

```sh
pnpm --filter api dev
```
