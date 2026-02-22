#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTLESS_BIN="$ROOT_DIR/node_modules/.bin/portless"

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

os_name="$(uname -s 2>/dev/null || echo unknown)"
case "$os_name" in
Darwin | Linux)
  portless_supported_os=true
  ;;
*)
  portless_supported_os=false
  ;;
esac

if [[ ! -x "$PORTLESS_BIN" ]]; then
  echo "Portless is required for local development."
  if [[ "$portless_supported_os" == false ]]; then
    echo "Unsupported operating system: ${os_name}"
    echo "Use macOS, Linux, or WSL2 on Windows to run this workflow."
  else
    echo "Install workspace dependencies with: pnpm install"
  fi
  exit 1
fi

if ! "$PORTLESS_BIN" --version >/dev/null 2>&1; then
  echo "Portless is required for local development."
  echo "Install workspace dependencies with: pnpm install"
  exit 1
fi

declare -A shell_env_overrides=()
for required_var in "${required_vars[@]}"; do
  if [[ ${!required_var+x} == x ]]; then
    shell_env_overrides[$required_var]="${!required_var}"
  fi
done

load_env_file "$ROOT_DIR/.env.example"
load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/.env.local"

for required_var in "${!shell_env_overrides[@]}"; do
  export "$required_var=${shell_env_overrides[$required_var]}"
done

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
