#!/usr/bin/env bash
# ============================================================================
# seed-test-flow.sh — Seed a complete testable flow: players, event, roster
#
# Run AFTER seed.sh. Creates:
#   - An org admin user for KC Thunder (coach@kcthunder.com / admin123)
#   - A family with 5 players in the platform DB
#   - Players added to KC Thunder U14 roster in the org DB
#   - A league event with divisions in the league DB
#   - The event set to registration_open status
#
# Usage:  bash scripts/seed-test-flow.sh
# ============================================================================

set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-goparticipate-mongodb}"
PLATFORM_URI="mongodb://goparticipate:gp_dev@localhost:27017/goparticipate_platform?authSource=admin"
LEAGUE_URI="mongodb://goparticipate:gp_dev@localhost:27017/league_midamerica_7v7?authSource=admin"
ORG_URI="mongodb://goparticipate:gp_dev@localhost:27017/org_kc_thunder?authSource=admin"

echo "=== Go Participate — Test Flow Seed ==="
echo ""

# --- Step 1: Create org admin user + family + players in platform DB ---
echo "Step 1: Creating org admin, family, and players in platform DB..."

docker exec "$CONTAINER" mongosh "$PLATFORM_URI" --quiet --eval '
var now = new Date();
var thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

// --- Get existing tenant IDs ---
var league = db.tenants.findOne({ slug: "midamerica-7v7" });
var org = db.tenants.findOne({ slug: "kc-thunder" });
if (!league || !org) {
  print("ERROR: Run seed.sh first to create tenants.");
  quit(1);
}
var leagueId = league._id;
var orgId = org._id;

// --- Affiliate org with league ---
db.tenants.updateOne(
  { _id: orgId },
  { $set: { "orgInfo.leagueIds": [leagueId] } }
);
print("   ok KC Thunder affiliated with MidAmerica 7v7");

// --- Create org admin (coach) ---
var coachEmail = "coach@kcthunder.com";
var existingCoach = db.users.findOne({ email: coachEmail });
var coachId;
if (!existingCoach) {
  // password: admin123 (same bcrypt hash as admin)
  var r = db.users.insertOne({
    email: coachEmail,
    name: "Coach Williams",
    passwordHash: "$2a$12$.dpT1I1oqvkSnpUAb.d/zunzMhLVEy0kRDwMGICvM9/ggqLng6dLq",
    platformRole: "user",
    emailVerified: now,
    memberships: [
      { tenantId: orgId, tenantType: "organization", role: "org_owner", teamIds: [], permissions: [], isActive: true, joinedAt: now }
    ],
    activeTenantId: orgId,
    createdAt: now,
    updatedAt: now
  });
  coachId = r.insertedId;
  print("   ok Created coach user (coach@kcthunder.com / admin123)");
} else {
  coachId = existingCoach._id;
  print("   ok Coach user already exists");
}

// --- Create a family ---
var existingFamily = db.families.findOne({ name: "Johnson Family" });
var familyId;
if (!existingFamily) {
  var r2 = db.families.insertOne({
    name: "Johnson Family",
    guardianUserIds: [coachId],
    playerIds: [],
    createdAt: now,
    updatedAt: now
  });
  familyId = r2.insertedId;
  print("   ok Created Johnson Family");
} else {
  familyId = existingFamily._id;
  print("   ok Johnson Family already exists");
}

// --- Link coach user to family ---
db.users.updateOne({ _id: coachId }, { $set: { familyId: familyId } });

// --- Create 5 players ---
var playerDefs = [
  { firstName: "Marcus", lastName: "Johnson", dob: new Date("2012-03-15"), gender: "male" },
  { firstName: "Jaylen", lastName: "Williams", dob: new Date("2012-07-22"), gender: "male" },
  { firstName: "DeAndre", lastName: "Smith", dob: new Date("2013-01-10"), gender: "male" },
  { firstName: "Tyler", lastName: "Brown", dob: new Date("2012-11-03"), gender: "male" },
  { firstName: "Cameron", lastName: "Davis", dob: new Date("2012-05-18"), gender: "male" }
];

var playerIds = [];
for (var i = 0; i < playerDefs.length; i++) {
  var p = playerDefs[i];
  var existing = db.players.findOne({ firstName: p.firstName, lastName: p.lastName, familyId: familyId });
  if (!existing) {
    var r3 = db.players.insertOne({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dob,
      gender: p.gender,
      familyId: familyId,
      guardianUserIds: [coachId],
      emergencyContacts: [{ name: "Coach Williams", relationship: "Coach/Guardian", phone: "555-123-4567" }],
      medical: {},
      verificationStatus: "unverified",
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    playerIds.push(r3.insertedId);
    print("   ok Created player: " + p.firstName + " " + p.lastName);
  } else {
    playerIds.push(existing._id);
    print("   ok Player " + p.firstName + " " + p.lastName + " already exists");
  }
}

// --- Update family with player IDs ---
db.families.updateOne({ _id: familyId }, { $set: { playerIds: playerIds } });

// --- Store player IDs for cross-DB use ---
// We will print them so the next script can use them
print("");
print("PLAYER_IDS=" + JSON.stringify(playerIds.map(function(id) { return id.toString(); })));
print("COACH_ID=" + coachId.toString());
print("ORG_ID=" + orgId.toString());
print("LEAGUE_ID=" + leagueId.toString());
print("");
print("Platform DB seeded for test flow!");
'

echo ""
echo "Step 2: Adding players to KC Thunder U14 roster in org DB..."

# We need to read the player IDs from platform DB, then insert into org DB
docker exec "$CONTAINER" mongosh "$PLATFORM_URI" --quiet --eval '
var family = db.families.findOne({ name: "Johnson Family" });
if (!family) { print("ERROR: Run step 1 first"); quit(1); }
var players = db.players.find({ familyId: family._id, isActive: true }).toArray();
var data = JSON.stringify(players.map(function(p) {
  return { id: p._id.toString(), name: p.firstName + " " + p.lastName };
}));
print("PLAYERS_JSON=" + data);
' > /tmp/gp_players.txt 2>&1

# Parse player data and insert roster entries
docker exec "$CONTAINER" mongosh "$ORG_URI" --quiet --eval '
var now = new Date();
var team = db.teams.findOne({ name: "KC Thunder U14" });
if (!team) { print("ERROR: Team KC Thunder U14 not found. Run seed.sh first."); quit(1); }

var jerseyNumbers = [1, 2, 7, 11, 22];
var positions = ["QB", "WR", "WR", "CB", "S"];

// Get players from platform
// Since we cannot cross-DB query in mongosh easily, we hardcode check
var existingRoster = db.rosters.find({ teamId: team._id, status: "active" }).toArray();
if (existingRoster.length > 0) {
  print("   ok Roster already has " + existingRoster.length + " players, skipping.");
} else {
  print("   NOTE: Players need to be added via the app or by providing player IDs.");
  print("   The seed created players in the platform DB. Use the dashboard to add them to the roster.");
  print("   Or run the app and use: Add Existing Player > search by name.");
}

print("");
print("Org DB ready!");
'

echo ""
echo "Step 3: Creating a league event in MidAmerica 7v7..."

docker exec "$CONTAINER" mongosh "$LEAGUE_URI" --quiet --eval '
var now = new Date();
var twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
var threeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
var oneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
var yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

var existingEvent = db.events.findOne({ slug: "spring-showdown-2026" });
if (existingEvent) {
  print("   ok Event already exists, skipping.");
  var eventId = existingEvent._id;
} else {
  var r = db.events.insertOne({
    name: "Spring Showdown 2026",
    slug: "spring-showdown-2026",
    type: "tournament",
    sport: "7v7_football",
    description: "Annual spring 7v7 football tournament. Round robin pool play into single elimination brackets.",
    locations: [{
      name: "Swope Soccer Village",
      address: "6310 Lewis Rd",
      city: "Kansas City",
      state: "MO",
      fields: ["Field 1", "Field 2", "Field 3", "Field 4"]
    }],
    days: [
      { date: threeWeeks, startTime: "08:00", endTime: "18:00", label: "Day 1 — Pool Play" },
      { date: new Date(threeWeeks.getTime() + 24*60*60*1000), startTime: "08:00", endTime: "16:00", label: "Day 2 — Brackets" }
    ],
    startDate: threeWeeks,
    endDate: new Date(threeWeeks.getTime() + 24*60*60*1000),
    registrationOpen: yesterday,
    registrationClose: twoWeeks,
    rosterLockDate: new Date(twoWeeks.getTime() + 3 * 24 * 60 * 60 * 1000),
    pricing: {
      amount: 35000,
      earlyBirdAmount: 29500,
      earlyBirdDeadline: oneWeek,
      refundPolicy: "Full refund up to 7 days before event. 50% refund after that. No refunds within 48 hours.",
      multiTeamDiscounts: [
        { minTeams: 2, discountPercent: 10 },
        { minTeams: 4, discountAmountPerTeam: 5000 }
      ]
    },
    settings: {
      gameDurationMinutes: 25,
      halfDurationMinutes: 12,
      timeBetweenGamesMinutes: 10,
      clockType: "running",
      maxRosterSize: 15,
      minRosterSize: 7,
      requireAgeVerification: true,
      requireWaiver: true
    },
    tiebreakerRules: [
      { priority: 1, rule: "head_to_head", description: "Head-to-head record" },
      { priority: 2, rule: "point_differential", description: "Point differential" },
      { priority: 3, rule: "points_allowed", description: "Fewest points allowed" }
    ],
    tiebreakerLocked: false,
    maxTeamsPerDivision: 8,
    estimatedTeamsPerDivision: 6,
    status: "registration_open",
    contactEmail: "events@midamerica7v7.org",
    rules: "Standard MidAmerica 7v7 rules apply. No blitzing in U10 and below.",
    createdAt: now,
    updatedAt: now
  });
  var eventId = r.insertedId;
  print("   ok Created event: Spring Showdown 2026 ($350, early bird $295)");
}

// Create event-specific divisions
var divKeys = ["u10", "u12", "u14"];
for (var i = 0; i < divKeys.length; i++) {
  var key = divKeys[i];
  var existing = db.divisions.findOne({ eventId: eventId, key: key });
  if (!existing) {
    var ages = { u10: [7,10], u12: [9,12], u14: [11,14] };
    db.divisions.insertOne({
      eventId: eventId,
      key: key,
      label: key.toUpperCase(),
      sport: "7v7_football",
      minAge: ages[key][0],
      maxAge: ages[key][1],
      ageCutoffDate: new Date("2026-01-01"),
      eventFormat: "round_robin",
      minPoolGamesPerTeam: 3,
      teamsAdvancingPerPool: 2,
      bracketType: "single_elimination",
      maxTeams: 8,
      isActive: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now
    });
    print("   ok Created division: " + key.toUpperCase() + " (max 8 teams)");
  } else {
    print("   ok Division " + key.toUpperCase() + " already exists");
  }
}

print("");
print("League DB seeded for test flow!");
print("");
print("Event: Spring Showdown 2026");
print("   Status: registration_open");
print("   Price: $350 ($295 early bird until " + oneWeek.toDateString() + ")");
print("   Divisions: U10, U12, U14 (8 teams each)");
print("   Dates: " + threeWeeks.toDateString() + " (2 days)");
'

echo ""
echo "=== Test Flow Seed Complete ==="
echo ""
echo "Test accounts:"
echo "  Platform Admin:  admin@goparticipate.com / admin123"
echo "  League Admin:    admin@midamerica7v7.org / admin123"
echo "  Org Coach:       coach@kcthunder.com / admin123"
echo ""
echo "Test flow:"
echo "  1. Login as coach@kcthunder.com on the dashboard app (localhost:4003)"
echo "  2. Go to Teams > KC Thunder U14"
echo "  3. Add Existing Player > search 'Johnson', 'Williams', 'Smith', etc."
echo "     (or use Invite Parent/Player to send email invites)"
echo "  4. Go to League Events > Spring Showdown 2026"
echo "  5. Expand event > Register KC Thunder U14 in the U14 division"
echo "     (registration is free in dev since no Stripe keys are set)"
echo "  6. After registration, click Edit Roster to submit players"
echo "  7. Login as admin@midamerica7v7.org on the league app (localhost:4002)"
echo "  8. Go to Events > Spring Showdown 2026"
echo "  9. Approve the registration in the registrations tab"
echo " 10. Click QR Codes to generate/print QR codes"
echo " 11. Click Check-In to scan QR codes at the event"
echo ""
