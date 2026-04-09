#!/usr/bin/env bash
# Kill Go Participate dev servers (ports 4000-4004) and restart
# Does NOT kill node processes for other projects

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Stopping Go Participate dev servers (ports 4000-4004)..."
for port in 4000 4001 4002 4003 4004; do
  # Use PowerShell for reliable port-to-PID lookup on Windows
  pid=$(powershell.exe -NoProfile -Command "(Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess" 2>/dev/null | tr -d '\r')
  if [ -n "$pid" ] && [ "$pid" != "0" ] && [ "$pid" != "" ]; then
    taskkill //F //PID "$pid" 2>/dev/null && echo "  Killed PID $pid (port $port)" || true
  fi
done

sleep 1

echo "Starting all apps..."
cd "$PROJECT_ROOT"
npm run dev
