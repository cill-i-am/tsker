#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run Drizzle Studio against local Postgres."
  echo "Install Docker Desktop (or equivalent) and retry."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "'docker compose' is required."
  echo "Install Docker Compose v2 and retry."
  exit 1
fi

echo "Starting local Postgres via Docker..."
docker compose up -d postgres >/dev/null

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

echo "Launching Drizzle Studio..."
exec pnpm --filter @repo/db exec drizzle-kit studio --config drizzle.config.ts "$@"
