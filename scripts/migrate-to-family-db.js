/**
 * Migration: Move Players from platform DB to per-family DBs
 *
 * For each user with guardianUserIds on players:
 * 1. Create a family DB (family_<familyId>)
 * 2. Copy player data into FamilyPlayer collection
 * 3. Create FamilyProfile + FamilyGuardian
 * 4. Set User.familyId
 *
 * Run: node scripts/migrate-to-family-db.js
 */

const mongoose = require("mongoose");

const MONGO_URI =
  "mongodb://goparticipate:gp_dev@localhost:27020/goparticipate_platform?authSource=admin";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log("Connected to platform DB");

  // Get all users who don't have a familyId yet
  const users = await db.collection("users").find({
    familyId: { $exists: false },
    platformRole: { $ne: "gp_admin" },
  }).toArray();

  console.log(`Found ${users.length} users without familyId`);

  // Get all players
  const allPlayers = await db.collection("players").find({}).toArray();
  console.log(`Found ${allPlayers.length} players in platform DB`);

  // Group players by guardian
  const guardianPlayerMap = new Map(); // userId -> players[]
  for (const player of allPlayers) {
    for (const guardianId of (player.guardianUserIds || [])) {
      const gid = guardianId.toString();
      if (!guardianPlayerMap.has(gid)) guardianPlayerMap.set(gid, []);
      guardianPlayerMap.get(gid).push(player);
    }
  }

  // Also handle players with no guardians — group by "orphan" families
  const orphanPlayers = allPlayers.filter(
    (p) => !p.guardianUserIds || p.guardianUserIds.length === 0,
  );

  let migratedFamilies = 0;
  let migratedPlayers = 0;

  // Process each user
  for (const user of users) {
    const uid = user._id.toString();
    const players = guardianPlayerMap.get(uid) || [];

    if (players.length === 0) {
      // User has no players — still create a family DB for them if they have memberships
      const hasMemberships = user.memberships?.some((m) => m.isActive || m.status === "active");
      if (!hasMemberships) continue;
    }

    const familyId = new mongoose.Types.ObjectId();
    const familyDbName = `family_${familyId.toString()}`;

    console.log(`\nMigrating ${user.email} → ${familyDbName} (${players.length} players)`);

    // Connect to new family DB
    const famConn = mongoose.createConnection(
      MONGO_URI.replace("goparticipate_platform", familyDbName),
    );
    await famConn.asPromise();
    const famDb = famConn.db;

    // Build org connections from user memberships
    const orgConnections = [];
    const leagueConnections = [];
    for (const m of (user.memberships || [])) {
      if (!m.tenantSlug) continue;
      if (m.tenantType === "organization") {
        orgConnections.push({
          tenantSlug: m.tenantSlug,
          tenantName: m.tenantSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          connectedAt: m.joinedAt || new Date(),
          status: "active",
        });
      } else if (m.tenantType === "league") {
        leagueConnections.push({
          tenantSlug: m.tenantSlug,
          tenantName: m.tenantSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          connectedAt: m.joinedAt || new Date(),
          status: "active",
        });
      }
    }

    // Create FamilyProfile
    await famDb.collection("familyprofiles").insertOne({
      familyName: `${user.name}'s Family`,
      primaryUserId: user._id,
      address: {},
      orgConnections,
      leagueConnections,
      programHistory: [],
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        shareVerificationAcrossLeagues: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create FamilyGuardian
    await famDb.collection("familyguardians").insertOne({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      relationship: "guardian",
      isPrimary: true,
      canMakeDecisions: true,
      playerIds: players.map((p) => p._id),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Copy players into family DB
    for (const player of players) {
      // Look up team history from org rosters
      const teamHistory = [];
      for (const m of (user.memberships || [])) {
        if (m.tenantType !== "organization" || !m.tenantSlug) continue;
        try {
          const orgDbName = `org_${m.tenantSlug.replace(/-/g, "_")}`;
          const orgConn = mongoose.createConnection(
            MONGO_URI.replace("goparticipate_platform", orgDbName),
          );
          await orgConn.asPromise();
          const rosters = await orgConn.db.collection("rosters").find({
            playerId: player._id,
          }).toArray();

          for (const r of rosters) {
            const team = await orgConn.db.collection("teams").findOne({ _id: r.teamId });
            if (team) {
              teamHistory.push({
                tenantSlug: m.tenantSlug,
                tenantName: m.tenantSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                teamName: team.name,
                teamId: team._id.toString(),
                sport: team.sport || "",
                season: new Date().getFullYear().toString(),
                year: new Date().getFullYear(),
                jerseyNumber: r.jerseyNumber,
                joinedAt: r.joinedAt || r.createdAt || new Date(),
              });
            }
          }
          await orgConn.close();
        } catch (err) {
          console.error(`  Error loading rosters from ${m.tenantSlug}:`, err.message);
        }
      }

      await famDb.collection("familyplayers").insertOne({
        _id: player._id, // Keep same ID for cross-reference
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender || "other",
        photos: [],
        currentPhotoUrl: player.photo || undefined,
        sizing: player.sizing || {},
        emergencyContacts: player.emergencyContacts || [],
        medical: player.medical || {},
        sports: [],
        teamHistory,
        verificationStatus: player.verificationStatus || "unverified",
        socials: player.socials || {},
        isActive: player.isActive !== false,
        createdAt: player.createdAt || new Date(),
        updatedAt: new Date(),
      });

      migratedPlayers++;
    }

    // Set familyId on user
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { familyId } },
    );

    await famConn.close();
    migratedFamilies++;
  }

  // Handle orphan players (no guardians)
  if (orphanPlayers.length > 0) {
    console.log(`\n${orphanPlayers.length} orphan players (no guardians) — skipping, will be linked when parents sign up`);
  }

  console.log(`\nMigration complete:`);
  console.log(`  Families created: ${migratedFamilies}`);
  console.log(`  Players migrated: ${migratedPlayers}`);
  console.log(`  Orphan players: ${orphanPlayers.length}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
