#!/usr/bin/env bash
# Lanzador de desarrollo: MongoDB (docker) + backend + frontend, todo junto.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/code/backend"
FRONTEND_DIR="$ROOT_DIR/code/frontend"
MONGO_CONTAINER="speedgalileo-mongo"

info() { printf "\033[36m==> %s\033[0m\n" "$1"; }
warn() { printf "\033[33m!!  %s\033[0m\n" "$1"; }
ok()   { printf "\033[32mOK  %s\033[0m\n" "$1"; }

command -v pnpm >/dev/null 2>&1 || { warn "pnpm no encontrado. Instálalo: npm i -g pnpm"; exit 1; }

# --- .env ---
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  info "backend/.env creado desde .env.example"
fi
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  cp "$FRONTEND_DIR/.env.local.example" "$FRONTEND_DIR/.env.local"
  info "frontend/.env.local creado desde .env.local.example"
fi

# --- dependencias ---
[ -d "$BACKEND_DIR/node_modules" ]  || { info "Instalando deps backend"; (cd "$BACKEND_DIR" && pnpm install); }
[ -d "$FRONTEND_DIR/node_modules" ] || { info "Instalando deps frontend"; (cd "$FRONTEND_DIR" && pnpm install); }

# --- MongoDB ---
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
    ok "MongoDB ya corriendo ($MONGO_CONTAINER)"
  elif docker ps -a --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
    info "Arrancando contenedor MongoDB existente"
    docker start "$MONGO_CONTAINER" >/dev/null
  else
    info "Creando contenedor MongoDB ($MONGO_CONTAINER)"
    docker run -d --name "$MONGO_CONTAINER" -p 27017:27017 mongo:7 >/dev/null
  fi
  info "Esperando MongoDB..."
  for _ in $(seq 1 30); do
    docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1 && { ok "MongoDB listo"; break; }
    sleep 0.5
  done
else
  warn "docker no disponible. Asegúrate de tener MongoDB corriendo (ver MONGO_URI en backend/.env)"
fi

# --- IP LAN (solo pa' mostrarla; por ahora todo corre en http plano) ---
LAN_IPS="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' || true)"
PRIMARY_IP="$(echo "$LAN_IPS" | head -1)"

cleanup() {
  echo
  info "Deteniendo backend y frontend..."
  kill 0 2>/dev/null
  exit 0
}
trap cleanup INT TERM

info "Backend  -> http://localhost:4000"
(cd "$BACKEND_DIR" && pnpm run dev 2>&1 | sed -u 's/^/[backend]  /') &

sleep 1

if [ -n "$PRIMARY_IP" ]; then
  info "Frontend -> http://localhost:3000  |  Android: http://$PRIMARY_IP:3000"
  warn "Sin HTTPS: la cámara del escáner QR no funcionará desde el celular por esta IP (getUserMedia exige contexto seguro)."
else
  info "Frontend -> http://localhost:3000"
fi
(cd "$FRONTEND_DIR" && pnpm run dev 2>&1 | sed -u 's/^/[frontend] /') &

ok "Todo arriba. Ctrl+C para detener (MongoDB queda corriendo)."
wait
