#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_INFRA_DIR="$BACKEND_DIR/infra/docker"
FRONTEND_DIR="$ROOT_DIR/frontend"
MOBILE_DIR="$ROOT_DIR/mobile"
COMPOSE_FILE="$BACKEND_INFRA_DIR/docker-compose.yml"
ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_PID=""
MOBILE_PID=""
RUN_LOG_DIR="$ROOT_DIR/.run"
RETRIES="${DEPLOY_RETRIES:-120}"
COMPOSE_BIN="docker"
COMPOSE_ARGS=(compose)

mkdir -p "$RUN_LOG_DIR"

if [[ ! -f "$ENV_FILE" && -f "$BACKEND_DIR/.env.example" ]]; then
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
else
  if [[ ! -f "$BACKEND_DIR/.env.example" ]]; then
    echo "Missing backend/.env and backend/.env.example"
    exit 1
  fi
fi

PYTHON_BIN="python3"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi


def detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN="docker"
    COMPOSE_ARGS=(compose)
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN="docker-compose"
    COMPOSE_ARGS=()
    return 0
  fi
  echo "Neither docker compose nor docker-compose is available"
  exit 1
}

compose() {
  "${COMPOSE_BIN}" "${COMPOSE_ARGS[@]}" "$@"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing command: $cmd"
    exit 1
  fi
}

wait_for_tcp() {
  local name="$1"
  local host="$2"
  local port="$3"
  local attempt=1

  until "$PYTHON_BIN" - "$host" "$port" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

s = socket.socket()
s.settimeout(1.0)
try:
    s.connect((host, port))
except Exception:
    raise SystemExit(1)
else:
    s.close()
    raise SystemExit(0)
PY
  do
    if (( attempt >= RETRIES )); then
      echo "$name failed to start on ${host}:${port}"
      echo "Check: docker compose logs -f"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempt=1

  while :; do
    if curl -fsS "$url" >/dev/null; then
      echo "$name is ready"
      return 0
    fi
    if (( attempt >= RETRIES )); then
      echo "$name health check failed: $url"
      return 1
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
}

ensure_frontend_ready() {
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found. Skip frontend/mobile."
    return
  fi

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    (cd "$FRONTEND_DIR" && npm ci)
  fi
  if [[ ! -d "$MOBILE_DIR/node_modules" ]]; then
    (cd "$MOBILE_DIR" && npm ci)
  fi
}

cleanup() {
  echo "Shutting down local services..."
  if [[ -n "${FRONTEND_PID}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${MOBILE_PID}" ]]; then
    kill "$MOBILE_PID" 2>/dev/null || true
  fi
  compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

require_cmd docker
require_cmd curl
detect_compose

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE"
  exit 1
fi

echo "Starting backend docker stack..."
compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build | tee "$RUN_LOG_DIR/backend.log"

wait_for_tcp "PostgreSQL" "127.0.0.1" "${POSTGRES_HOST_PORT:-15432}"
wait_for_tcp "Redis" "127.0.0.1" "${REDIS_HOST_PORT:-16379}"
wait_for_tcp "ChromaDB" "127.0.0.1" "${CHROMA_HOST_PORT:-18001}"

if ! wait_for_http "Backend" "http://localhost:${API_HTTP_PORT:-18000}/api/v1/health" >/dev/null; then
  echo "Backend did not become healthy. Check $RUN_LOG_DIR/backend.log"
  exit 1
fi
echo "Backend is ready"

ensure_frontend_ready

if command -v npm >/dev/null 2>&1; then
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
  echo "Mobile logs: $RUN_LOG_DIR/mobile.log"
  echo "Frontend logs: $RUN_LOG_DIR/frontend.log"
fi

echo "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "Backend:  http://localhost:${API_HTTP_PORT:-18000}"
echo "Backend logs: $RUN_LOG_DIR/backend.log"
echo "API logs:"
compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=30 api
echo "Press Ctrl+C to stop all services."

wait
