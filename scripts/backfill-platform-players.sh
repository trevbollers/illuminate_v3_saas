#!/bin/bash
# scripts/backfill-platform-players.sh
#
# One-time cleanup for data created before the "find-or-create platform
# Player during invite accept" fix landed. Before the fix, we rostered
# kids using their FamilyPlayer._id — which breaks email delivery because
# resolveRecipients walks Roster → Player.guardianUserIds and the platform
# `players` collection never had a record for them.
#
# This script walks every family DB, creates a platform Player per
# FamilyPlayer (if missing), links the two via platformPlayerId, and
# rewrites any Roster entry that references the FamilyPlayer._id to
# reference the new Platform Player._id instead. Idempotent — safe to
# re-run.
#
# Run ONCE from your laptop after shipping the platform-player fix:
#   ./scripts/backfill-platform-players.sh

set -euo pipefail

if [[ ! -f .env.deploy ]]; then
  echo "ERROR: .env.deploy missing. Run from the repo root." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.deploy
set +a

: "${DEPLOY_HOST:?DEPLOY_HOST not set}"
: "${DEPLOY_USER:?DEPLOY_USER not set}"
: "${DEPLOY_PATH:?DEPLOY_PATH not set}"

echo "[backfill] Running on ${DEPLOY_HOST}..."

ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<'REMOTE'
set -e
cd /opt/go-participate
source .env

docker exec -i gp-mongodb mongosh \
  -u "$MONGO_USERNAME" -p "$MONGO_PASSWORD" \
  --authenticationDatabase admin --quiet --eval '
const platformDB = db.getSiblingDB("goparticipate_platform");

// 1. Ensure every user with a familyId has a matching platform Family doc
const usersWithFamilyId = platformDB.users.find({ familyId: { $exists: true, $ne: null } }).toArray();
let familiesCreated = 0;
for (const u of usersWithFamilyId) {
  const exists = platformDB.families.findOne({ _id: u.familyId });
  if (!exists) {
    platformDB.families.insertOne({
      _id: u.familyId,
      name: (u.name || "User") + " Family",
      guardianUserIds: [u._id],
      playerIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    familiesCreated++;
  } else {
    // Backfill guardian if missing
    platformDB.families.updateOne(
      { _id: u.familyId },
      { $addToSet: { guardianUserIds: u._id } }
    );
  }
}
print("families_created=" + familiesCreated);

// 2. For each family DB, find FamilyPlayers without platformPlayerId and
//    create matching Platform Player records. Collect the mapping for
//    the roster rewrite in step 3.
//
// Family DBs are named "family_<familyId>". Walk all DBs and pick them.
const allDbs = db.adminCommand({ listDatabases: 1 }).databases;
const familyDbs = allDbs.filter(d => d.name.startsWith("family_"));
print("family_dbs_found=" + familyDbs.length);

// { familyPlayerIdString: platformPlayerId }
const rosterMapping = {};
let playersCreated = 0;
let linksSet = 0;

for (const dbInfo of familyDbs) {
  const famDB = db.getSiblingDB(dbInfo.name);
  const familyIdStr = dbInfo.name.substring("family_".length);
  let familyObjectId;
  try { familyObjectId = ObjectId(familyIdStr); } catch (e) { continue; }

  // Resolve guardian user id via the platform Family doc (we created it above)
  const family = platformDB.families.findOne({ _id: familyObjectId });
  if (!family) continue;
  const guardianUserIds = family.guardianUserIds || [];

  const famPlayers = famDB.familyplayers.find({ isActive: { $ne: false } }).toArray();
  for (const fp of famPlayers) {
    if (fp.platformPlayerId) continue; // already linked

    const platformPlayer = platformDB.players.insertOne({
      firstName: fp.firstName,
      lastName: fp.lastName,
      dateOfBirth: fp.dateOfBirth,
      gender: fp.gender,
      familyId: familyObjectId,
      guardianUserIds: guardianUserIds,
      emergencyContacts: fp.emergencyContacts || [],
      medical: { notes: fp.medical && fp.medical.notes },
      sizing: fp.sizing || {},
      socials: fp.socials || {},
      verificationStatus: fp.verificationStatus || "unverified",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newPlayerId = platformPlayer.insertedId;
    playersCreated++;

    famDB.familyplayers.updateOne(
      { _id: fp._id },
      { $set: { platformPlayerId: newPlayerId } }
    );
    linksSet++;

    platformDB.families.updateOne(
      { _id: familyObjectId },
      { $addToSet: { playerIds: newPlayerId } }
    );

    rosterMapping[fp._id.toString()] = newPlayerId;
  }
}
print("platform_players_created=" + playersCreated);
print("familyplayer_links_set=" + linksSet);

// 3. Rewrite Roster entries in every org tenant DB that reference a
//    FamilyPlayer._id, pointing them at the new Platform Player._id.
const orgTenants = platformDB.tenants.find({ tenantType: "organization" }).toArray();
let rostersFixed = 0;

for (const t of orgTenants) {
  const orgDBName = "org_" + t.slug.replace(/-/g, "_");
  const orgDB = db.getSiblingDB(orgDBName);
  const rosters = orgDB.rosters.find({}).toArray();
  for (const r of rosters) {
    const fpIdStr = r.playerId && r.playerId.toString();
    if (!fpIdStr) continue;
    if (rosterMapping[fpIdStr]) {
      orgDB.rosters.updateOne(
        { _id: r._id },
        { $set: { playerId: rosterMapping[fpIdStr] } }
      );
      rostersFixed++;
    }
  }
}
print("roster_entries_fixed=" + rostersFixed);
print("OK");
'
REMOTE

echo "[backfill] Done."
