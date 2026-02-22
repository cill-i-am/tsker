#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

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

if ! "$ROOT_DIR/node_modules/.bin/portless" --version >/dev/null 2>&1; then
  echo "Portless is required for local development."
  echo "Install workspace dependencies with: pnpm install"
  exit 1
fi

load_env_file "$ROOT_DIR/.env.example"
load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"

required_vars=(
  APP_ENV
  AUTH_COOKIE_DOMAIN
  AUTH_TRUSTED_ORIGINS
  AUTH_URL
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  DATABASE_URL
  LOG_LEVEL
  VITE_API_URL
  VITE_AUTH_URL
)

for required_var in "${required_vars[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Missing required environment variable: ${required_var}"
    echo "Set it in .env.local (or .env) and retry."
    exit 1
  fi
done

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

echo "Applying database migrations..."
pnpm --filter @repo/db drizzle:migrate

echo "Starting app development servers..."
exec turbo run dev
