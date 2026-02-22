# Portless Adoption in `tsker`

`tsker` now uses [`vercel-labs/portless`](https://github.com/vercel-labs/portless) for default local development commands.

## Default local URLs

- Web app: `http://app.localhost:1355`
- API app: `http://api.localhost:1355`

## What changed

- Root `pnpm dev` continues to start Postgres + migrations, then starts app dev servers.
- `apps/web` dev now runs via `portless app vite dev`.
- `apps/api` dev now runs via `portless api ...`.
- Local auth/env defaults point to `.localhost` origins and API URL.
- Web server origin logic now treats `*.localhost` as local HTTP hosts.

## Escape hatch

Use direct scripts when needed:

- `pnpm --filter web dev:direct`
- `pnpm --filter api dev:direct`

Or bypass portless globally:

```bash
PORTLESS=0 pnpm dev
```
