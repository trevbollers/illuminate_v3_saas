#!/usr/bin/env bash
# Kill any running Next.js dev servers and restart all apps

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Stopping any running Next.js processes..."
taskkill //F //IM node.exe 2>/dev/null || true

sleep 2

echo "Starting all apps..."
cd "$PROJECT_ROOT"
npm run dev
