#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for local development."
  echo "Install Docker Desktop (or equivalent) and retry."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "'docker compose' is required for local development."
  echo "Install Docker Compose v2 and retry."
  exit 1
fi

echo "Starting local Postgres via Docker..."
docker compose up -d postgres

echo "Waiting for Postgres to become healthy..."
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres -d tsker >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! docker compose exec -T postgres pg_isready -U postgres -d tsker >/dev/null 2>&1; then
  echo "Postgres did not become ready in time."
  docker compose logs postgres
  exit 1
fi

export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/tsker}"
export APP_ENV="${APP_ENV:-local}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-local-dev-secret-local-dev-secret-12345}"
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://api.localhost:1355}"
export AUTH_TRUSTED_ORIGINS="${AUTH_TRUSTED_ORIGINS:-http://app.localhost:1355}"
export AUTH_COOKIE_DOMAIN="${AUTH_COOKIE_DOMAIN:-localhost}"
export VITE_API_URL="${VITE_API_URL:-http://api.localhost:1355}"

echo "Applying database migrations..."
pnpm --filter @repo/db drizzle:migrate

echo "Starting app development servers..."
exec turbo run dev
