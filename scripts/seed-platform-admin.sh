#!/bin/bash
# scripts/seed-platform-admin.sh — promote a user to platform admin on the
# production server. Creates the user if they don't exist, sets password
# if PASSWORD is provided. Idempotent — re-running updates in place.
#
# Run from your LAPTOP (Git Bash), from the repo root. Uses .env.deploy
# for the SSH target, same as build-and-ship.sh.
#
# Usage:
#   EMAIL=you@example.com ./scripts/seed-platform-admin.sh
#     -> creates/promotes user, prompts for password interactively
#
#   EMAIL=you@example.com NAME="Trevor Bollers" ./scripts/seed-platform-admin.sh
#     -> set display name too
#
#   EMAIL=you@example.com NO_PASSWORD=1 ./scripts/seed-platform-admin.sh
#     -> skip password (e.g. re-run to update role only)
#
# After seeding, sign in at https://admin.gameon.goparticipate.com
# with email + password.

set -euo pipefail

: "${EMAIL:?EMAIL env var required (e.g. EMAIL=you@example.com ./scripts/seed-platform-admin.sh)}"
NAME="${NAME:-Platform Admin}"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [[ ! -f .env.deploy ]]; then
  echo "ERROR: .env.deploy missing. Run this from the repo root." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.deploy
set +a

: "${DEPLOY_HOST:?DEPLOY_HOST not set in .env.deploy}"
: "${DEPLOY_USER:?DEPLOY_USER not set in .env.deploy}"
: "${DEPLOY_PATH:?DEPLOY_PATH not set in .env.deploy}"

# Collect password (hidden input) unless explicitly skipped
PASSWORD_HASH=""
if [[ "${NO_PASSWORD:-0}" != "1" ]]; then
  read -s -p "Set password for ${EMAIL} (leave blank to skip): " PASSWORD
  echo
  if [[ -n "$PASSWORD" ]]; then
    read -s -p "Confirm password: " PASSWORD_CONFIRM
    echo
    if [[ "$PASSWORD" != "$PASSWORD_CONFIRM" ]]; then
      echo "ERROR: passwords don't match." >&2
      exit 1
    fi
    if [[ ${#PASSWORD} -lt 8 ]]; then
      echo "ERROR: password must be at least 8 characters." >&2
      exit 1
    fi
    # bcrypt locally via node + bcryptjs (workspace dep)
    echo "[seed] Hashing password locally..."
    PASSWORD_HASH=$(PW="$PASSWORD" node -e "require('bcryptjs').hash(process.env.PW, 12).then(h => process.stdout.write(h))")
    if [[ -z "$PASSWORD_HASH" ]]; then
      echo "ERROR: failed to generate bcrypt hash. Is bcryptjs installed? Try 'npm install'." >&2
      exit 1
    fi
    unset PASSWORD PASSWORD_CONFIRM
  fi
fi

echo "[seed] Promoting ${EMAIL} (${NAME}) to gp_admin on ${DEPLOY_HOST}..."

# Build the $set clause — optionally include passwordHash.
SET_PASSWORD=""
if [[ -n "$PASSWORD_HASH" ]]; then
  SET_PASSWORD=",
      passwordHash: \"${PASSWORD_HASH}\""
fi

# SSH in, source the remote .env (mongo creds), pipe a mongosh script to the
# mongodb container.
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<REMOTE
set -e
cd ${DEPLOY_PATH}
source .env
docker exec -i gp-mongodb mongosh \\
  -u "\$MONGO_USERNAME" \\
  -p "\$MONGO_PASSWORD" \\
  --authenticationDatabase admin \\
  --quiet \\
  goparticipate_platform <<'MONGO'
db.users.updateOne(
  { email: "${EMAIL}" },
  {
    \$set: {
      platformRole: "gp_admin",
      name: "${NAME}",
      updatedAt: new Date()${SET_PASSWORD}
    },
    \$setOnInsert: {
      email: "${EMAIL}",
      emailVerified: new Date(),
      socials: {},
      notificationPreferences: {
        emailMessages: true,
        smsUrgent: false,
        emailAnnouncements: true
      },
      platformPermissions: [],
      memberships: [],
      createdAt: new Date()
    }
  },
  { upsert: true }
);
const u = db.users.findOne(
  { email: "${EMAIL}" },
  { email: 1, name: 1, platformRole: 1, passwordHash: 1, createdAt: 1, updatedAt: 1 }
);
// Mask the password hash for display
if (u && u.passwordHash) { u.passwordHash = "(set, " + u.passwordHash.length + " chars)"; }
print("OK — user record:");
printjson(u);
MONGO
REMOTE

echo ""
echo "[seed] Done. Sign in at https://admin.gameon.goparticipate.com with ${EMAIL}."
