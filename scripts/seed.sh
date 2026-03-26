#!/usr/bin/env bash
# ============================================================================
# seed.sh — Seed the Go Participate platform via docker exec mongosh
#
# Usage:  bash scripts/seed.sh
# ============================================================================

set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-goparticipate-mongodb}"
MONGO_URI="mongodb://goparticipate:gp_dev@localhost:27017/goparticipate_platform?authSource=admin"
LEAGUE_URI="mongodb://goparticipate:gp_dev@localhost:27017/league_midamerica_7v7?authSource=admin"
ORG_URI="mongodb://goparticipate:gp_dev@localhost:27017/org_kc_thunder?authSource=admin"

echo "=== Go Participate Database Seed ==="
echo ""

# --- Seed platform database ---
echo "Seeding platform database..."

docker exec "$CONTAINER" mongosh "$MONGO_URI" --quiet --eval '
var now = new Date();
var thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

var AI_ADDONS = [
  { featureId: "ai_coach", name: "AI Coach", description: "AI-powered practice plans, lineup suggestions, and game recaps.", pricing: { monthly: 499, stripePriceId: "" } },
  { featureId: "ai_scout", name: "AI Scout", description: "Player evaluation reports and development tracking powered by AI.", pricing: { monthly: 499, stripePriceId: "" } }
];

var plans = [
  { planId: "free", name: "Free", scope: "organization", description: "Get started — 1 team, 15 players. Basic scheduling, RSVP, chat.", features: ["1 team","15 players","Scheduling & RSVP","Basic chat","Event discovery & registration","Age verification","Family dashboard (basic)"], limits: { users: 2, teams: 1, players: 15, eventsPerMonth: 10, storageGb: 1 }, pricing: { monthly: 0, annual: 0, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: [], isActive: true, sortOrder: 0 },
  { planId: "team_pro", name: "Team Pro", scope: "organization", description: "Full team management with stats, player development, and advanced communication.", features: ["Everything in Free","25 players","Full stat tracking","Player development","Advanced communication","Season archives","Calendar sync","Remove GP branding"], limits: { users: 5, teams: 1, players: 25, eventsPerMonth: 50, storageGb: 5 }, pricing: { monthly: 999, annual: 9588, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 999 },
  { planId: "partner", name: "Partner Tier", scope: "organization", description: "All Team Pro features at 50% off — unlocked via uniform partner commitment.", features: ["Everything in Team Pro","Priority size collection","Partner gear catalog","Partner Team badge","Priority support"], limits: { users: 5, teams: 1, players: 25, eventsPerMonth: 50, storageGb: 5 }, pricing: { monthly: 499, annual: 4788, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 499 },
  { planId: "organization", name: "Organization", scope: "organization", description: "Multi-team management for clubs and organizations.", features: ["Everything in Team Pro","Up to 10 teams","150 players","Multi-team dashboard","Org-wide registration","Financial rollup","Tryout management","Staff management","Bulk communication"], limits: { users: 25, teams: 10, players: 150, eventsPerMonth: 200, storageGb: 25 }, pricing: { monthly: 2999, annual: 28788, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 2999 },
  { planId: "league", name: "League", scope: "league", description: "Full league management — events, verification, brackets, and compliance.", features: ["Everything in Organization","Unlimited teams in league","Event creation & management","Age verification admin","Bracket/schedule generation","Cross-org compliance","Registration fee collection","Your Prep Sports integration","Standings & results","API access"], limits: { users: 50, teams: 999, players: 9999, eventsPerMonth: 999, storageGb: 100 }, pricing: { monthly: 7999, annual: 76788, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 7999 }
];

for (var i = 0; i < plans.length; i++) {
  db.plans.updateOne({ planId: plans[i].planId }, { $set: plans[i], $setOnInsert: { createdAt: now, updatedAt: now } }, { upsert: true });
  print("   ok Plan: " + plans[i].name + " ($" + (plans[i].pricing.monthly / 100) + "/mo)");
}

print("");
print("Seeding sports definitions...");
db.sports.updateOne({ sportId: "7v7_football" }, { $set: { sportId: "7v7_football", name: "7v7 Football", playersOnField: 7, typicalRosterSize: { min: 7, max: 15 }, positions: [{ key: "qb", label: "Quarterback", abbreviation: "QB" },{ key: "c", label: "Center", abbreviation: "C" },{ key: "wr", label: "Wide Receiver", abbreviation: "WR" },{ key: "cb", label: "Cornerback", abbreviation: "CB" },{ key: "s", label: "Safety", abbreviation: "S" },{ key: "lb", label: "Linebacker", abbreviation: "LB" },{ key: "rush", label: "Rusher", abbreviation: "RUSH" }], divisionTemplates: [{ key: "u8", label: "U8", minAge: 5, maxAge: 8 },{ key: "u10", label: "U10", minAge: 7, maxAge: 10 },{ key: "u12", label: "U12", minAge: 9, maxAge: 12 },{ key: "u14", label: "U14", minAge: 11, maxAge: 14 },{ key: "u16", label: "U16", minAge: 13, maxAge: 16 },{ key: "u18", label: "U18", minAge: 15, maxAge: 18 }], statCategories: [{ key: "passing", label: "Passing", stats: [{ key: "completions", label: "Completions", type: "integer" },{ key: "attempts", label: "Attempts", type: "integer" },{ key: "yards", label: "Yards", type: "integer" },{ key: "touchdowns", label: "Touchdowns", type: "integer" },{ key: "interceptions", label: "Interceptions", type: "integer" }] },{ key: "receiving", label: "Receiving", stats: [{ key: "catches", label: "Catches", type: "integer" },{ key: "yards", label: "Yards", type: "integer" },{ key: "touchdowns", label: "Touchdowns", type: "integer" }] },{ key: "defensive", label: "Defensive", stats: [{ key: "interceptions", label: "INTs", type: "integer" },{ key: "pbus", label: "PBUs", type: "integer" },{ key: "sacks", label: "Sacks", type: "integer" }] }], isActive: true }, $setOnInsert: { createdAt: now } }, { upsert: true });
db.sports.updateOne({ sportId: "basketball" }, { $set: { sportId: "basketball", name: "Basketball", playersOnField: 5, typicalRosterSize: { min: 5, max: 12 }, positions: [{ key: "pg", label: "Point Guard", abbreviation: "PG" },{ key: "sg", label: "Shooting Guard", abbreviation: "SG" },{ key: "sf", label: "Small Forward", abbreviation: "SF" },{ key: "pf", label: "Power Forward", abbreviation: "PF" },{ key: "c", label: "Center", abbreviation: "C" }], divisionTemplates: [{ key: "u8", label: "U8", minAge: 5, maxAge: 8 },{ key: "u10", label: "U10", minAge: 7, maxAge: 10 },{ key: "u12", label: "U12", minAge: 9, maxAge: 12 },{ key: "u14", label: "U14", minAge: 11, maxAge: 14 },{ key: "u16", label: "U16", minAge: 13, maxAge: 16 },{ key: "u18", label: "U18", minAge: 15, maxAge: 18 }], statCategories: [{ key: "scoring", label: "Scoring", stats: [{ key: "points", label: "Points", type: "integer" },{ key: "fgm", label: "FGM", type: "integer" },{ key: "fga", label: "FGA", type: "integer" },{ key: "tpm", label: "3PM", type: "integer" },{ key: "tpa", label: "3PA", type: "integer" },{ key: "ftm", label: "FTM", type: "integer" },{ key: "fta", label: "FTA", type: "integer" }] },{ key: "rebounds", label: "Rebounds", stats: [{ key: "offensive", label: "OFF", type: "integer" },{ key: "defensive", label: "DEF", type: "integer" },{ key: "total", label: "TOT", type: "integer" }] },{ key: "other", label: "Other", stats: [{ key: "assists", label: "AST", type: "integer" },{ key: "steals", label: "STL", type: "integer" },{ key: "blocks", label: "BLK", type: "integer" },{ key: "turnovers", label: "TO", type: "integer" },{ key: "fouls", label: "PF", type: "integer" }] }], isActive: true }, $setOnInsert: { createdAt: now } }, { upsert: true });
print("   ok 7v7 Football + Basketball");

print("");
print("Seeding platform admin...");
var existingAdmin = db.users.findOne({ email: "admin@goparticipate.com" });
var adminId;
if (!existingAdmin) {
  var r = db.users.insertOne({ email: "admin@goparticipate.com", name: "GP Admin", passwordHash: "$2a$12$xlRsO1/PlZejgrigOS1wa.u1xyU1Zw88fcP9L7bAkf.GhQjQ6O612", platformRole: "gp_admin", emailVerified: now, memberships: [], createdAt: now, updatedAt: now });
  adminId = r.insertedId;
  print("   ok Created platform admin (admin@goparticipate.com / admin123)");
} else {
  adminId = existingAdmin._id;
  print("   ok Platform admin already exists, skipping.");
}

print("");
print("Seeding league tenant (MidAmerica 7v7)...");
var existingLeague = db.tenants.findOne({ slug: "midamerica-7v7" });
var leagueId;
if (!existingLeague) {
  var r2 = db.tenants.insertOne({ name: "MidAmerica 7v7", slug: "midamerica-7v7", tenantType: "league", sport: "7v7_football", owner: adminId, plan: { planId: "league", status: "active", currentPeriodEnd: thirtyDays, addOns: [] }, settings: { branding: { primaryColor: "#1D4ED8", businessName: "MidAmerica 7v7 Football" }, features: {} }, status: "active", onboardingStep: 999, createdAt: now, updatedAt: now });
  leagueId = r2.insertedId;
  print("   ok Created league MidAmerica 7v7 on League plan");
} else {
  leagueId = existingLeague._id;
  print("   ok League tenant already exists, skipping.");
}

print("");
print("Seeding org tenant (KC Thunder)...");
var existingOrg = db.tenants.findOne({ slug: "kc-thunder" });
var orgId;
if (!existingOrg) {
  var r3 = db.tenants.insertOne({ name: "KC Thunder", slug: "kc-thunder", tenantType: "organization", sport: "7v7_football", owner: adminId, plan: { planId: "organization", status: "active", currentPeriodEnd: thirtyDays, addOns: [] }, settings: { branding: { primaryColor: "#DC2626", businessName: "KC Thunder 7v7" }, features: {} }, status: "active", onboardingStep: 999, createdAt: now, updatedAt: now });
  orgId = r3.insertedId;
  print("   ok Created org KC Thunder on Organization plan");
} else {
  orgId = existingOrg._id;
  print("   ok Org tenant already exists, skipping.");
}

var adminUser = db.users.findOne({ _id: adminId });
var hasLeague = (adminUser.memberships || []).some(function(m) { return m.tenantId.toString() === leagueId.toString(); });
if (!hasLeague) {
  db.users.updateOne({ _id: adminId }, { $push: { memberships: { tenantId: leagueId, tenantType: "league", role: "league_owner", teamIds: [], permissions: [], isActive: true, joinedAt: now } }, $set: { activeTenantId: leagueId, updatedAt: now } });
  print("   ok Added admin as league_owner of MidAmerica 7v7");
}

var hasOrg = (adminUser.memberships || []).some(function(m) { return m.tenantId.toString() === orgId.toString(); });
if (!hasOrg) {
  db.users.updateOne({ _id: adminId }, { $push: { memberships: { tenantId: orgId, tenantType: "organization", role: "org_owner", teamIds: [], permissions: [], isActive: true, joinedAt: now } } });
  print("   ok Added admin as org_owner of KC Thunder");
}

print("");
print("Seeding league admin user (admin@midamerica7v7.org)...");
var existingLeagueAdmin = db.users.findOne({ email: "admin@midamerica7v7.org" });
if (!existingLeagueAdmin) {
  db.users.insertOne({ email: "admin@midamerica7v7.org", name: "MidAmerica Admin", passwordHash: "$2a$12$xlRsO1/PlZejgrigOS1wa.u1xyU1Zw88fcP9L7bAkf.GhQjQ6O612", platformRole: "user", emailVerified: now, memberships: [{ tenantId: leagueId, tenantType: "league", role: "league_owner", teamIds: [], permissions: [], isActive: true, joinedAt: now }], activeTenantId: leagueId, createdAt: now, updatedAt: now });
  print("   ok Created league admin (admin@midamerica7v7.org / admin123)");
} else {
  print("   ok League admin already exists, skipping.");
}

print("");
print("Seeding system config...");
db.systemconfigs.updateOne({ configId: "platform" }, { $setOnInsert: {
  configId: "platform",
  stripe: { status: { configured: false }, mode: "unknown" },
  email: { status: { configured: false }, provider: "resend", domainVerified: false },
  ai: { status: { configured: false }, provider: "anthropic", model: "claude-sonnet-4-6", aiCoachEnabled: false, aiScoutEnabled: false },
  storage: { status: { configured: false }, provider: "local", encryptionEnabled: false },
  platform: { domain: "goparticipate.com", reservedSubdomains: ["www","api","admin","app","auth","billing","docs","help","mail","status","support"], maintenanceMode: false, registrationOpen: true },
  createdAt: now, updatedAt: now
} }, { upsert: true });
print("   ok System config initialized");

print("");
print("Platform DB seeded!");
'

# --- Seed league database ---
echo ""
echo "Seeding league database (league_midamerica_7v7)..."

docker exec "$CONTAINER" mongosh "$LEAGUE_URI" --quiet --eval '
var now = new Date();

if (!db.divisions.findOne({ key: "u12", eventId: { $exists: false } })) {
  var divisions = [
    { key: "u8", label: "U8", sport: "7v7_football", minAge: 5, maxAge: 8, ageCutoffDate: new Date("2018-01-01"), gradeBasedEligibility: false, eventFormat: "round_robin", minPoolGamesPerTeam: 3, teamsAdvancingPerPool: 2, bracketType: "single_elimination", isActive: true, sortOrder: 0, createdAt: now, updatedAt: now },
    { key: "u10", label: "U10", sport: "7v7_football", minAge: 7, maxAge: 10, ageCutoffDate: new Date("2016-01-01"), gradeBasedEligibility: false, eventFormat: "round_robin", minPoolGamesPerTeam: 3, teamsAdvancingPerPool: 2, bracketType: "single_elimination", isActive: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { key: "u12", label: "U12", sport: "7v7_football", minAge: 9, maxAge: 12, ageCutoffDate: new Date("2014-01-01"), gradeBasedEligibility: false, eventFormat: "round_robin", minPoolGamesPerTeam: 3, teamsAdvancingPerPool: 2, bracketType: "single_elimination", isActive: true, sortOrder: 2, createdAt: now, updatedAt: now },
    { key: "u14", label: "U14", sport: "7v7_football", minAge: 11, maxAge: 14, ageCutoffDate: new Date("2012-01-01"), gradeBasedEligibility: false, eventFormat: "round_robin", minPoolGamesPerTeam: 3, teamsAdvancingPerPool: 2, bracketType: "single_elimination", isActive: true, sortOrder: 3, createdAt: now, updatedAt: now },
    { key: "u16", label: "U16", sport: "7v7_football", minAge: 13, maxAge: 16, ageCutoffDate: new Date("2010-01-01"), gradeBasedEligibility: false, eventFormat: "round_robin", minPoolGamesPerTeam: 3, teamsAdvancingPerPool: 2, bracketType: "single_elimination", isActive: true, sortOrder: 4, createdAt: now, updatedAt: now }
  ];
  db.divisions.insertMany(divisions);
  print("   ok Created 5 league-wide age divisions (U8-U16)");
} else {
  print("   ok League divisions already exist, skipping.");
}

print("");
print("League DB seeded!");
'

# --- Seed org database ---
echo ""
echo "Seeding org database (org_kc_thunder)..."

docker exec "$CONTAINER" mongosh "$ORG_URI" --quiet --eval '
var now = new Date();

if (!db.teams.findOne({ divisionKey: "u12" })) {
  var teams = [
    { name: "KC Thunder U12", divisionKey: "u12", sport: "7v7_football", season: "2026", coachIds: [], managerIds: [], isActive: true, createdAt: now, updatedAt: now },
    { name: "KC Thunder U14", divisionKey: "u14", sport: "7v7_football", season: "2026", coachIds: [], managerIds: [], isActive: true, createdAt: now, updatedAt: now }
  ];
  db.teams.insertMany(teams);
  print("   ok Created 2 teams (U12, U14)");
} else {
  print("   ok Teams already exist, skipping.");
}

print("");
print("Org DB seeded!");
'

echo ""
echo "=== Seed complete ==="
echo "   Platform DB: plans, sports, admin user, league tenant, org tenant"
echo "   League DB: age divisions"
echo "   Org DB: sample teams"
echo ""
echo "   Login (platform admin): admin@goparticipate.com / admin123"
echo "   Login (league admin):   admin@midamerica7v7.org / admin123"
