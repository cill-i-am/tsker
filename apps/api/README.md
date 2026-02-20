# API App

Effect-based Node API focused on uptime monitoring and observability-first defaults.

## Endpoints

- `GET /health/live`
  - Always returns `200` when the process can serve requests.
  - Response includes `status`, `service`, `uptimeSeconds`, `timestamp`, and `requestId`.
- `GET /health/ready`
  - Returns `200` when critical readiness checks pass.
  - Returns `503` when any critical check fails or times out.
  - In `production`, response is intentionally minimal (`status`, `timestamp`, `requestId`).

## Observability

- Request logging is enabled via Effect HTTP middleware.
- OTLP export is enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is configured.
- Service resource attributes include:
  - `service.name=api`
  - `deployment.environment=<APP_ENV>`
- OTLP headers format:
  - Comma-separated `key=value` pairs
  - Values may be quoted for embedded commas
  - Example: `Authorization=Bearer token,x-tenant="org,team"`

## Environment Variables

See `.env.example` for the full list and defaults.

Required by environment:

- `APP_ENV=local`
  - `OTEL_EXPORTER_OTLP_ENDPOINT` optional.
- `APP_ENV=staging` or `APP_ENV=production`
  - `OTEL_EXPORTER_OTLP_ENDPOINT` required at startup.

Validated values:

- `APP_ENV`: `local | staging | production`
- `LOG_LEVEL`: `trace | debug | info | warn | error | fatal`

## Local Development

- Start dev server: `pnpm turbo run dev --filter=api`
- Run tests: `pnpm turbo run test --filter=api`
- Build app: `pnpm turbo run build --filter=api`
- Run built app: `pnpm --filter api start`
