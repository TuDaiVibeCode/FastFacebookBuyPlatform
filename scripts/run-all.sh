#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_INFRA_DIR="$BACKEND_DIR/infra/docker"
FRONTEND_DIR="$ROOT_DIR/frontend"
MOBILE_DIR="$ROOT_DIR/mobile"
COMPOSE_FILE="$BACKEND_INFRA_DIR/docker-compose.yml"
ENV_FILE="$BACKEND_DIR/.env"
COMPOSE_PID=""
FRONTEND_PID=""
MOBILE_PID=""
RUN_LOG_DIR="$ROOT_DIR/.run"

mkdir -p "$RUN_LOG_DIR"

if [[ ! -f "$ENV_FILE" && -f "$BACKEND_DIR/.env.example" ]]; then
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

cleanup() {
  echo "Shutting down local services..."
  if [[ -n "${FRONTEND_PID}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${MOBILE_PID}" ]]; then
    kill "$MOBILE_PID" 2>/dev/null || true
  fi
  if [[ -n "${COMPOSE_PID}" ]]; then
    kill "$COMPOSE_PID" 2>/dev/null || true
  fi
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Starting backend docker stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build >"$RUN_LOG_DIR/backend.log" 2>&1 &
COMPOSE_PID=$!

echo "Waiting for backend health endpoint..."
for attempt in $(seq 1 120); do
  if curl -fsS "http://localhost:${API_HTTP_PORT:-18000}/api/v1/health" >/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:${API_HTTP_PORT:-18000}/api/v1/health" >/dev/null; then
  echo "Backend did not become healthy. Check $RUN_LOG_DIR/backend.log"
  exit 1
fi

echo "Starting frontend and mobile..."

(
  cd "$FRONTEND_DIR"
  npm run dev -- --port "${FRONTEND_PORT:-3000}"
) >"$RUN_LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

(
  cd "$MOBILE_DIR"
  npm run start -- --port "${MOBILE_PORT:-8081}"
) >"$RUN_LOG_DIR/mobile.log" 2>&1 &
MOBILE_PID=$!

echo "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "Backend:  http://localhost:${API_HTTP_PORT:-18000}"
echo "Mobile logs: $RUN_LOG_DIR/mobile.log"
echo "Frontend logs: $RUN_LOG_DIR/frontend.log"
echo "Backend logs: $RUN_LOG_DIR/backend.log"
echo "Press Ctrl+C to stop all services."

wait
