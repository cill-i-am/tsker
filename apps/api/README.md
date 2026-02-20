# API App

Effect-based Node API with a lightweight uptime endpoint.

## Endpoints

- `GET /up`
  - Returns `200` when the process can serve requests.
  - Response includes `status`, `service`, `uptimeSeconds`, and `timestamp`.

## Environment Variables

- `PORT` (default: `3002`)
- `APP_ENV` (`local | staging | production`, default: `local`)
- `LOG_LEVEL` (`trace | debug | info | warn | error | fatal`, default: `info`)

## Scripts

- `pnpm --filter api dev`
- `pnpm --filter api type-check`
- `pnpm --filter api test`
- `pnpm --filter api build`
- `pnpm --filter api start`
