#!/bin/bash
# scripts/deploy-prod.sh — idempotent production deploy for Go Participate.
# Run from /opt/go-participate as a user with docker access (e.g. hhmack).
#
# Usage:
#   ./scripts/deploy-prod.sh                       # pull, build all apps, restart all
#   ./scripts/deploy-prod.sh dashboard             # build & restart just dashboard
#   ./scripts/deploy-prod.sh --no-build            # pull, restart all (no rebuild)
#   ./scripts/deploy-prod.sh --no-build dashboard  # restart just dashboard (env-only)
#   ./scripts/deploy-prod.sh --no-pull             # build & restart, skip git pull
#
# Designed for Hetzner CX11 (2 GB RAM + 4 GB swap). Builds happen one service
# at a time so peak RAM stays inside the swap budget. Re-runnable: a service
# whose layers are already cached will skip straight to the run step.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/go-participate}"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICES=(web admin league dashboard storefront)

NO_BUILD=0
NO_PULL=0
TARGET="all"

for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    --no-pull)  NO_PULL=1 ;;
    -h|--help)
      sed -n '2,17p' "$0"
      exit 0
      ;;
    -*)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
    *)
      TARGET="$arg"
      ;;
  esac
done

# Validate TARGET against the known service list
if [[ "$TARGET" != "all" ]]; then
  found=0
  for s in "${SERVICES[@]}"; do
    [[ "$s" == "$TARGET" ]] && found=1 && break
  done
  if [[ $found -eq 0 ]]; then
    echo "Unknown service '$TARGET'. Valid: ${SERVICES[*]} all" >&2
    exit 2
  fi
fi

cd "$REPO_DIR"

log() { printf '[deploy %s] %s\n' "$(date +%H:%M:%S)" "$*"; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "Repo: $REPO_DIR  branch: $BRANCH  target: $TARGET"

if [[ $NO_PULL -eq 0 ]]; then
  log "Pulling latest from origin/$BRANCH..."
  git pull --ff-only origin "$BRANCH"
else
  log "Skipping git pull (--no-pull)."
fi

if [[ ! -f .env.production ]]; then
  echo "ERROR: .env.production missing in $REPO_DIR. Aborting." >&2
  exit 1
fi

log "Ensuring mongodb is running..."
docker compose -f "$COMPOSE_FILE" up -d mongodb

build_one() {
  local svc="$1"
  log "Building $svc (this is the slow step on CX11)..."
  docker compose -f "$COMPOSE_FILE" build "$svc"
}

if [[ $NO_BUILD -eq 0 ]]; then
  if [[ "$TARGET" == "all" ]]; then
    for svc in "${SERVICES[@]}"; do
      build_one "$svc"
    done
  else
    build_one "$TARGET"
  fi
else
  log "Skipping builds (--no-build)."
fi

log "Starting containers..."
if [[ "$TARGET" == "all" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d
else
  docker compose -f "$COMPOSE_FILE" up -d "$TARGET"
fi

log "Reloading nginx (in case proxy targets came back on new IPs)..."
sudo nginx -t && sudo systemctl reload nginx || log "WARN: nginx reload skipped/failed — check 'sudo nginx -t' manually."

log "Container status:"
docker compose -f "$COMPOSE_FILE" ps

log "Done."
