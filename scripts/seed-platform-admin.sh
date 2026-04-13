#!/bin/bash
# scripts/seed-platform-admin.sh — promote a user to platform admin on the
# production server. Creates the user if they don't exist. Idempotent.
#
# Run from your LAPTOP (Git Bash), from the repo root. Uses .env.deploy
# for the SSH target, same as build-and-ship.sh.
#
# Usage:
#   EMAIL=you@example.com ./scripts/seed-platform-admin.sh
#   EMAIL=you@example.com NAME="Trevor Bollers" ./scripts/seed-platform-admin.sh
#
# After seeding, log in at https://admin.gameon.goparticipate.com with that
# email. Request a magic code — you'll have platform-wide admin access.

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

echo "[seed] Promoting ${EMAIL} (${NAME}) to gp_admin on ${DEPLOY_HOST}..."

# SSH in, source the remote .env (mongo creds), pipe a mongosh script to the
# mongodb container. Single quotes on the outer heredoc are critical — they
# prevent local shell from expanding \$MONGO_USERNAME / \$MONGO_PASSWORD / \$set
# before the remote bash gets them.
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
      updatedAt: new Date()
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
  { email: 1, name: 1, platformRole: 1, createdAt: 1, updatedAt: 1 }
);
print("OK — user record:");
printjson(u);
MONGO
REMOTE

echo ""
echo "[seed] Done. Sign in at https://admin.gameon.goparticipate.com with ${EMAIL}."
