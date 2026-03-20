#!/usr/bin/env bash
# ============================================================================
# seed.sh — Copy seed.js into the MongoDB container and run it with mongosh
#
# Usage:  bash scripts/seed.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER="${MONGO_CONTAINER:-illuminate-mongodb}"
MONGO_URI="mongodb://illuminate:illuminate_dev@localhost:27017/admin?authSource=admin"

echo "=== Illuminate Database Seed ==="
echo ""

docker cp "$SCRIPT_DIR/seed.js" "$CONTAINER":/tmp/seed.js
docker exec "$CONTAINER" mongosh "$MONGO_URI" --quiet --file /tmp/seed.js
