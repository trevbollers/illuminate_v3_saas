/**
 * Seed script: Court 45 Basketball + Minnesota Heat + tryout program
 *
 * Run: node scripts/seed-new-orgs.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI =
  "mongodb://goparticipate:gp_dev@localhost:27020/goparticipate_platform?authSource=admin";

async function seed() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log("Connected to platform DB");

  // ─── 1. Create Court 45 Basketball tenant ───
  const court45 = {
    name: "Court 45 Basketball",
    slug: "court-45-basketball",
    tenantType: "organization",
    sport: "basketball",
    status: "active",
    onboardingStep: 99,
    settings: {
      branding: { displayName: "Court 45 Basketball", primaryColor: "#FF6B00" },
      features: { aiCoachAssistant: false, liveScoring: false, playerDevelopment: false, storefront: false },
      notifications: { emailAlerts: true, pushNotifications: false },
    },
    socials: {},
    plan: {
      planId: "org_free",
      status: "active",
      addOns: [],
    },
    orgInfo: {
      city: "Minneapolis",
      state: "MN",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingCourt45 = await db.collection("tenants").findOne({ slug: "court-45-basketball" });
  let court45Id;
  if (existingCourt45) {
    court45Id = existingCourt45._id;
    console.log("Court 45 Basketball already exists:", court45Id);
  } else {
    const result = await db.collection("tenants").insertOne(court45);
    court45Id = result.insertedId;
    console.log("Created Court 45 Basketball:", court45Id);
  }

  // ─── 2. Create Minnesota Heat tenant ───
  const mnHeat = {
    name: "Minnesota Heat",
    slug: "minnesota-heat",
    tenantType: "organization",
    sport: "7v7_football",
    status: "active",
    onboardingStep: 99,
    settings: {
      branding: { displayName: "Minnesota Heat", primaryColor: "#DC2626" },
      features: { aiCoachAssistant: false, liveScoring: false, playerDevelopment: false, storefront: false },
      notifications: { emailAlerts: true, pushNotifications: false },
    },
    socials: {},
    plan: {
      planId: "org_free",
      status: "active",
      addOns: [],
    },
    orgInfo: {
      city: "Minneapolis",
      state: "MN",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingHeat = await db.collection("tenants").findOne({ slug: "minnesota-heat" });
  let heatId;
  if (existingHeat) {
    heatId = existingHeat._id;
    console.log("Minnesota Heat already exists:", heatId);
  } else {
    const result = await db.collection("tenants").insertOne(mnHeat);
    heatId = result.insertedId;
    console.log("Created Minnesota Heat:", heatId);
  }

  // ─── 3. Create admin users for both orgs ───
  const hashedPw = await bcrypt.hash("password123", 12);

  // Court 45 admin
  const court45Admin = await db.collection("users").findOne({ email: "coach@court45.com" });
  let court45AdminId;
  if (court45Admin) {
    court45AdminId = court45Admin._id;
  } else {
    const r = await db.collection("users").insertOne({
      email: "coach@court45.com",
      password: hashedPw,
      name: "Coach Davis",
      platformRole: "user",
      memberships: [{
        tenantId: court45Id,
        tenantSlug: "court-45-basketball",
        tenantType: "organization",
        role: "org_owner",
        roleLevel: 100,
        status: "active",
        joinedAt: new Date(),
      }],
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    court45AdminId = r.insertedId;
    console.log("Created Court 45 admin user:", court45AdminId);
  }

  // Update tenant owner
  await db.collection("tenants").updateOne(
    { _id: court45Id },
    { $set: { owner: court45AdminId } },
  );

  // Minnesota Heat admin
  const heatAdmin = await db.collection("users").findOne({ email: "coach@mnheat.com" });
  let heatAdminId;
  if (heatAdmin) {
    heatAdminId = heatAdmin._id;
  } else {
    const r = await db.collection("users").insertOne({
      email: "coach@mnheat.com",
      password: hashedPw,
      name: "Coach Williams",
      platformRole: "user",
      memberships: [{
        tenantId: heatId,
        tenantSlug: "minnesota-heat",
        tenantType: "organization",
        role: "org_owner",
        roleLevel: 100,
        status: "active",
        joinedAt: new Date(),
      }],
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    heatAdminId = r.insertedId;
    console.log("Created Minnesota Heat admin user:", heatAdminId);
  }

  await db.collection("tenants").updateOne(
    { _id: heatId },
    { $set: { owner: heatAdminId } },
  );

  // ─── 4. Seed Court 45 teams (boys 12U-18U, girls 14U-16U) ───
  const court45Conn = mongoose.createConnection(
    MONGO_URI.replace("goparticipate_platform", "org_court_45_basketball"),
  );
  await court45Conn.asPromise();
  const court45DB = court45Conn.db;

  const court45Teams = [
    { name: "Court 45 12U Boys", divisionKey: "12u", sport: "basketball", ageGroup: "12U Boys", isActive: true },
    { name: "Court 45 13U Boys", divisionKey: "13u", sport: "basketball", ageGroup: "13U Boys", isActive: true },
    { name: "Court 45 14U Boys", divisionKey: "14u", sport: "basketball", ageGroup: "14U Boys", isActive: true },
    { name: "Court 45 15U Boys", divisionKey: "15u", sport: "basketball", ageGroup: "15U Boys", isActive: true },
    { name: "Court 45 16U Boys", divisionKey: "16u", sport: "basketball", ageGroup: "16U Boys", isActive: true },
    { name: "Court 45 17U Boys", divisionKey: "17u", sport: "basketball", ageGroup: "17U Boys", isActive: true },
    { name: "Court 45 18U Boys", divisionKey: "18u", sport: "basketball", ageGroup: "18U Boys", isActive: true },
    { name: "Court 45 14U Girls", divisionKey: "14u_girls", sport: "basketball", ageGroup: "14U Girls", isActive: true },
    { name: "Court 45 15U Girls", divisionKey: "15u_girls", sport: "basketball", ageGroup: "15U Girls", isActive: true },
    { name: "Court 45 16U Girls", divisionKey: "16u_girls", sport: "basketball", ageGroup: "16U Girls", isActive: true },
  ];

  const existingTeams = await court45DB.collection("teams").countDocuments();
  if (existingTeams === 0) {
    const now = new Date();
    await court45DB.collection("teams").insertMany(
      court45Teams.map((t) => ({
        ...t,
        headCoachId: court45AdminId,
        coachIds: [],
        managerIds: [],
        socials: {},
        createdAt: now,
        updatedAt: now,
      })),
    );
    console.log(`Created ${court45Teams.length} Court 45 teams`);
  } else {
    console.log(`Court 45 already has ${existingTeams} teams`);
  }

  // ─── 5. Create tryout program for Court 45 ───
  const existingProgram = await court45DB.collection("programs").countDocuments();
  if (existingProgram === 0) {
    await court45DB.collection("programs").insertOne({
      name: "Fall 2026 Basketball Tryouts",
      slug: "fall-2026-tryouts",
      description: "Open tryouts for all Court 45 Basketball teams. Players will be evaluated across multiple sessions and assigned to teams based on skill level, attitude, and coachability.",
      programType: "tryout",
      sport: "basketball",
      startDate: new Date("2026-08-15"),
      endDate: new Date("2026-08-17"),
      sessions: [
        { label: "Day 1 — Skills Evaluation", date: new Date("2026-08-15"), startTime: "09:00", endTime: "12:00", location: "Court 45 Facility" },
        { label: "Day 2 — Scrimmages", date: new Date("2026-08-16"), startTime: "09:00", endTime: "12:00", location: "Court 45 Facility" },
        { label: "Day 3 — Final Cuts", date: new Date("2026-08-17"), startTime: "09:00", endTime: "11:00", location: "Court 45 Facility" },
      ],
      fee: 5000, // $50
      registrationOpen: true,
      capacity: 120,
      ageGroups: [
        { label: "12U Boys", gender: "boys", minAge: 10, maxAge: 12, capacity: 15 },
        { label: "13U Boys", gender: "boys", minAge: 11, maxAge: 13, capacity: 15 },
        { label: "14U Boys", gender: "boys", minAge: 12, maxAge: 14, capacity: 15 },
        { label: "15U Boys", gender: "boys", minAge: 13, maxAge: 15, capacity: 15 },
        { label: "16U Boys", gender: "boys", minAge: 14, maxAge: 16, capacity: 15 },
        { label: "17U Boys", gender: "boys", minAge: 15, maxAge: 17, capacity: 10 },
        { label: "18U Boys", gender: "boys", minAge: 16, maxAge: 18, capacity: 10 },
        { label: "14U Girls", gender: "girls", minAge: 12, maxAge: 14, capacity: 10 },
        { label: "15U Girls", gender: "girls", minAge: 13, maxAge: 15, capacity: 10 },
        { label: "16U Girls", gender: "girls", minAge: 14, maxAge: 16, capacity: 10 },
      ],
      location: "Court 45 Facility",
      city: "Minneapolis",
      state: "MN",
      isPublic: true,
      isActive: true,
      status: "registration_open",
      teamIds: [],
      tags: [],
      createdBy: court45AdminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Created Fall 2026 Basketball Tryouts program");
  }

  // ─── 6. Seed Minnesota Heat team (girls flag) ───
  const heatConn = mongoose.createConnection(
    MONGO_URI.replace("goparticipate_platform", "org_minnesota_heat"),
  );
  await heatConn.asPromise();
  const heatDB = heatConn.db;

  const existingHeatTeams = await heatDB.collection("teams").countDocuments();
  if (existingHeatTeams === 0) {
    const now = new Date();
    await heatDB.collection("teams").insertOne({
      name: "Minnesota Heat Girls Flag",
      divisionKey: "open",
      sport: "7v7_football",
      ageGroup: "Open Girls",
      headCoachId: heatAdminId,
      coachIds: [],
      managerIds: [],
      socials: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created Minnesota Heat Girls Flag team");

    // Create 10 players for the roster
    const girlNames = [
      ["Aaliyah", "Jackson"], ["Brianna", "Thomas"], ["Camille", "Rodriguez"],
      ["Destiny", "Williams"], ["Elena", "Martinez"], ["Faith", "Anderson"],
      ["Grace", "Taylor"], ["Harper", "Brown"], ["Ivory", "Davis"],
      ["Jasmine", "Wilson"],
    ];

    const team = await heatDB.collection("teams").findOne({ name: "Minnesota Heat Girls Flag" });
    const players = [];
    for (let i = 0; i < girlNames.length; i++) {
      const [first, last] = girlNames[i];
      const playerId = new mongoose.Types.ObjectId();
      // Create platform player
      await db.collection("players").insertOne({
        _id: playerId,
        firstName: first,
        lastName: last,
        dateOfBirth: new Date(2012, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: "female",
        guardianUserIds: [],
        createdAt: now,
        updatedAt: now,
      });
      players.push(playerId);
    }

    // Create roster entries
    for (let i = 0; i < players.length; i++) {
      await heatDB.collection("rosters").insertOne({
        teamId: team._id,
        playerId: players[i],
        playerName: `${girlNames[i][0]} ${girlNames[i][1]}`,
        jerseyNumber: (i + 1).toString(),
        position: ["QB", "WR", "WR", "WR", "Center", "Safety", "Corner", "Corner", "LB", "Rusher"][i],
        status: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log("Created 10 players + roster for Minnesota Heat");
  } else {
    console.log(`Minnesota Heat already has ${existingHeatTeams} teams`);
  }

  // ─── 7. Register Minnesota Heat for a MidAmerica event ───
  // Connect to midamerica league DB to create registration
  const maConn = mongoose.createConnection(
    MONGO_URI.replace("goparticipate_platform", "league_midamerica_7v7"),
  );
  await maConn.asPromise();
  const maDB = maConn.db;

  const springShowdown = await maDB.collection("events").findOne({ slug: "spring-showdown-2026" });
  if (springShowdown) {
    const existingReg = await maDB.collection("registrations").findOne({
      eventId: springShowdown._id,
      teamName: "Minnesota Heat Girls Flag",
    });
    if (!existingReg) {
      const heatTeam = await heatDB.collection("teams").findOne({ name: "Minnesota Heat Girls Flag" });
      const divisions = await maDB.collection("divisions").find({ eventId: springShowdown._id }).toArray();
      const targetDiv = divisions[0]; // Use first division

      if (targetDiv && heatTeam) {
        await maDB.collection("registrations").insertOne({
          eventId: springShowdown._id,
          divisionId: targetDiv._id,
          teamName: "Minnesota Heat Girls Flag",
          orgTenantId: heatId,
          orgSlug: "minnesota-heat",
          teamId: heatTeam._id,
          contactName: "Coach Williams",
          contactEmail: "coach@mnheat.com",
          contactPhone: "",
          status: "approved",
          rosterSnapshot: [],
          paymentStatus: "paid",
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("Registered Minnesota Heat for Spring Showdown 2026");
      }
    } else {
      console.log("Minnesota Heat already registered for Spring Showdown");
    }
  }

  // Close connections
  await court45Conn.close();
  await heatConn.close();
  await maConn.close();
  await mongoose.disconnect();
  console.log("\nDone! New orgs seeded.");
  console.log("  Court 45 Basketball: http://localhost:4000/court-45-basketball");
  console.log("  Minnesota Heat: http://localhost:4000/minnesota-heat");
  console.log("  Login: coach@court45.com / password123");
  console.log("  Login: coach@mnheat.com / password123");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
