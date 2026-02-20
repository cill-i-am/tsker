# tsker

This repository contains the API application and shared TypeScript tooling.

## Workspace layout

- `apps/api`: Effect-based API service
- `packages/typescript-config`: shared TypeScript configuration

## Code quality

This repository uses Ultracite with the Oxlint provider and Oxfmt for linting and formatting.

- `pnpm lint` - run Ultracite checks
- `pnpm lint:fix` - apply Ultracite autofixes
- `pnpm format` - apply Ultracite formatting

## Commands

From the repository root:

- `pnpm dev` – run development tasks through Turborepo
- `pnpm build` – build workspace projects
- `pnpm check-types` – run TypeScript checks
- `pnpm test` – run test tasks

To run only the API app locally:

```sh
pnpm --filter api dev
```
