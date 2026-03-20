#!/usr/bin/env bash
# =============================================================================
# Illuminate V3 — Local Development Setup
#
# This script:
#   1. Starts MongoDB + Redis via Docker Compose
#   2. Waits for MongoDB to accept connections
#   3. Creates the .env file (if missing) with local defaults
#   4. Verifies the MongoDB connection
#
# Usage:
#   chmod +x scripts/dev-setup.sh
#   ./scripts/dev-setup.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

cd "$PROJECT_ROOT"

# ---- 1. Check Docker is available ----
if ! command -v docker &> /dev/null; then
  error "Docker is not installed. Please install Docker Desktop: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &> /dev/null; then
  error "Docker daemon is not running. Please start Docker Desktop and try again."
  exit 1
fi

# ---- 2. Start Docker Compose services ----
info "Starting MongoDB and Redis containers..."
docker compose up -d

# ---- 3. Wait for MongoDB to be ready ----
echo -n "Waiting for MongoDB to accept connections"
MAX_RETRIES=30
RETRY=0
until docker exec illuminate-mongodb mongosh --quiet --eval "db.runCommand({ ping: 1 })" &> /dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo ""
    error "MongoDB did not become ready after ${MAX_RETRIES} seconds."
    error "Check logs: docker logs illuminate-mongodb"
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo ""
info "MongoDB is ready!"

# ---- 4. Create .env if missing ----
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  warn ".env file not found — creating from .env.example with local defaults..."

  # Generate a random NextAuth secret
  NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"

  # Replace the placeholder NextAuth secret
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' "s|NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32|NEXTAUTH_SECRET=${NEXTAUTH_SECRET}|" "$PROJECT_ROOT/.env"
  else
    # Linux/Git Bash sed
    sed -i "s|NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32|NEXTAUTH_SECRET=${NEXTAUTH_SECRET}|" "$PROJECT_ROOT/.env"
  fi

  info ".env created with local MongoDB URI and generated NextAuth secret."
else
  info ".env already exists — skipping."
fi

# ---- 5. Verify MongoDB connection ----
MONGO_URI="mongodb://illuminate:illuminate_dev@localhost:27017/illuminate_platform?authSource=admin"

info "Verifying MongoDB connection..."
RESULT=$(docker exec illuminate-mongodb mongosh "$MONGO_URI" --quiet --eval "
  db = db.getSiblingDB('illuminate_platform');
  const collections = db.getCollectionNames();
  print('Database: illuminate_platform');
  print('Collections: ' + (collections.length > 0 ? collections.join(', ') : '(none yet — will be created on first write)'));
  print('Connection: OK');
" 2>&1)

if echo "$RESULT" | grep -q "Connection: OK"; then
  info "MongoDB connection verified!"
  echo "$RESULT" | while read -r line; do
    echo "    $line"
  done
else
  error "Could not connect to MongoDB:"
  echo "$RESULT"
  exit 1
fi

# ---- 6. Summary ----
echo ""
echo "=============================================="
info "Local development environment is ready!"
echo "=============================================="
echo ""
echo "  MongoDB: mongodb://illuminate:illuminate_dev@localhost:27017"
echo "  Redis:   redis://localhost:6379"
echo ""
echo "  Next steps:"
echo "    npm run dev        # Start all apps in dev mode"
echo "    npm run build      # Build all apps"
echo ""
echo "  To stop services:"
echo "    docker compose down"
echo ""
echo "  To view MongoDB logs:"
echo "    docker logs -f illuminate-mongodb"
echo ""
