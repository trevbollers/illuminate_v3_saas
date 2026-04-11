#!/bin/bash
# scripts/build-and-ship.sh — build all 5 app images locally, save to a
# tarball, ship to the server, load, and restart. Runs on your laptop.
#
# Usage:
#   ./scripts/build-and-ship.sh                  # build all, ship, restart all
#   ./scripts/build-and-ship.sh web              # only web
#   ./scripts/build-and-ship.sh web dashboard    # only these two
#
# Requires:
#   - Docker Desktop running on this machine
#   - .env.deploy in repo root with DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH
#   - Key-based SSH to $DEPLOY_USER@$DEPLOY_HOST (run ssh-copy-id once)
#   - docker-compose.prod.yml and .env.production already present on the
#     server at $DEPLOY_PATH (this script ships the compose file each run,
#     but .env.production is managed manually on the server)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [[ ! -f .env.deploy ]]; then
  echo "ERROR: .env.deploy missing. Copy .env.deploy.example to .env.deploy and fill it in." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.deploy
set +a

: "${DEPLOY_HOST:?DEPLOY_HOST not set in .env.deploy}"
: "${DEPLOY_USER:?DEPLOY_USER not set in .env.deploy}"
: "${DEPLOY_PATH:?DEPLOY_PATH not set in .env.deploy}"

ALL_SERVICES=(web admin league dashboard storefront)
if [[ $# -gt 0 ]]; then
  SERVICES=("$@")
else
  SERVICES=("${ALL_SERVICES[@]}")
fi

# Validate service names
for svc in "${SERVICES[@]}"; do
  ok=0
  for s in "${ALL_SERVICES[@]}"; do [[ "$s" == "$svc" ]] && ok=1 && break; done
  [[ $ok -eq 0 ]] && { echo "Unknown service: $svc (valid: ${ALL_SERVICES[*]})" >&2; exit 2; }
done

log() { printf '\n[ship %s] %s\n' "$(date +%H:%M:%S)" "$*"; }

TAG="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
TARBALL="/tmp/gp-images-${TAG}.tar.gz"
REMOTE_TARBALL="/tmp/gp-images.tar.gz"

log "Building images locally: ${SERVICES[*]}"
docker compose -f docker-compose.build.yml build "${SERVICES[@]}"

log "Tagging with :${TAG}"
for svc in "${SERVICES[@]}"; do
  docker tag "goparticipate/${svc}:latest" "goparticipate/${svc}:${TAG}"
done

log "Saving images to ${TARBALL}"
IMAGE_REFS=()
for svc in "${SERVICES[@]}"; do
  IMAGE_REFS+=("goparticipate/${svc}:latest")
done
docker save "${IMAGE_REFS[@]}" | gzip > "$TARBALL"
ls -lh "$TARBALL"

log "Shipping tarball to ${DEPLOY_USER}@${DEPLOY_HOST}"
scp "$TARBALL" "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_TARBALL}"

log "Shipping docker-compose.prod.yml"
scp docker-compose.prod.yml "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/docker-compose.prod.yml"

# Build the remote command as a single line so CRLF-in-heredoc is never an issue.
SERVICE_LIST="${SERVICES[*]}"
REMOTE_CMD="set -e; cd ${DEPLOY_PATH}; echo '[remote] loading images...'; gunzip -c ${REMOTE_TARBALL} | docker load; echo '[remote] starting mongodb...'; docker compose -f docker-compose.prod.yml up -d mongodb; echo '[remote] (re)starting: ${SERVICE_LIST}'; docker compose -f docker-compose.prod.yml up -d ${SERVICE_LIST}; echo '[remote] reloading nginx...'; sudo nginx -t && sudo systemctl reload nginx; echo '[remote] cleaning up tarball...'; rm -f ${REMOTE_TARBALL}; echo '[remote] status:'; docker compose -f docker-compose.prod.yml ps"

log "Executing remote load + restart"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "$REMOTE_CMD"

log "Cleaning local tarball"
rm -f "$TARBALL"

log "Done. Verify at https://gameon.goparticipate.com"
