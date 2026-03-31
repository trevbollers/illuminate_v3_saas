export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectPlatformDB, Tenant, Player, User, connectTenantDB, getOrgModels } from "@goparticipate/db";

/**
 * POST /api/public/[slug]/programs/[programSlug]/register
 *
 * Public tryout/program registration. Creates or links player, registers for tryout.
 *
 * Body: {
 *   parentEmail: string,
 *   parentName: string,
 *   parentPhone?: string,
 *   playerFirstName: string,
 *   playerLastName: string,
 *   playerDob: string,         // ISO date
 *   ageGroup: string,
 *   playerId?: string,         // If existing player
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; programSlug: string } },
): Promise<NextResponse> {
  const { slug, programSlug } = params;

  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug, tenantType: "organization" }).select("_id").lean();
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const conn = await connectTenantDB(slug, "organization");
  const { Program, TryoutSession, TryoutRegistration, Roster, Attendance } = getOrgModels(conn);

  const program = await Program.findOne({ slug: programSlug, isActive: true }).lean();
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const p = program as any;
  if (p.programType !== "tryout") {
    return NextResponse.json({ error: "This program does not support tryout registration" }, { status: 400 });
  }

  // Find or create the tryout session
  let session = await TryoutSession.findOne({ programId: p._id });
  if (!session) {
    return NextResponse.json({ error: "Tryout session not yet created by the organization" }, { status: 400 });
  }

  const body = await req.json();
  const { parentEmail, parentName, parentPhone, playerFirstName, playerLastName, playerDob, ageGroup, playerId } = body;

  if (!parentEmail || !playerFirstName || !playerLastName || !ageGroup) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find or create parent user
  let parentUser = await User.findOne({ email: parentEmail.toLowerCase() }).lean();
  let parentUserId: Types.ObjectId;

  if (parentUser) {
    parentUserId = (parentUser as any)._id;
  } else {
    const newUser = await User.create({
      email: parentEmail.toLowerCase(),
      name: parentName || `${playerFirstName}'s Parent`,
      phone: parentPhone,
      platformRole: "user",
      memberships: [],
      emailVerified: false,
    });
    parentUserId = (newUser as any)._id;
  }

  // Find or create player
  let playerObjectId: Types.ObjectId;
  const playerName = `${playerFirstName} ${playerLastName}`;

  if (playerId && Types.ObjectId.isValid(playerId)) {
    playerObjectId = new Types.ObjectId(playerId);
  } else {
    // Check if player already exists for this parent
    const existingPlayer = await Player.findOne({
      firstName: playerFirstName,
      lastName: playerLastName,
      guardianUserIds: parentUserId,
    }).lean();

    if (existingPlayer) {
      playerObjectId = (existingPlayer as any)._id;
    } else {
      const newPlayer = await Player.create({
        firstName: playerFirstName,
        lastName: playerLastName,
        dateOfBirth: playerDob ? new Date(playerDob) : undefined,
        gender: "unknown",
        guardianUserIds: [parentUserId],
      });
      playerObjectId = (newPlayer as any)._id;
    }
  }

  // Check duplicate registration
  const existing = await TryoutRegistration.findOne({
    sessionId: session._id,
    playerId: playerObjectId,
  });
  if (existing) {
    return NextResponse.json({
      error: "Player already registered for this tryout",
      registration: existing,
    }, { status: 409 });
  }

  // Assign tryout number
  const tryoutNumber = session.nextTryoutNumber;
  session.nextTryoutNumber = tryoutNumber + 1;
  await session.save();

  // Historical bonus
  const rosters = await Roster.find({ playerId: playerObjectId }).lean();
  const attendance = await Attendance.find({ playerId: playerObjectId }).lean();
  const seasons = new Set((rosters as any[]).map((r) => r.season).filter(Boolean));
  const present = (attendance as any[]).filter((a) => a.status === "present" || a.status === "late").length;
  const attendanceRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) / 100 : 0;
  const historicalBonus = Math.round(
    (attendanceRate * 3 + Math.min(seasons.size, 5) + Math.min(present / 10, 3)) *
      session.historicalBonusWeight * 10,
  ) / 10;

  const registration = await TryoutRegistration.create({
    sessionId: session._id,
    playerId: playerObjectId,
    playerName,
    ageGroup,
    tryoutNumber,
    paymentStatus: p.fee > 0 ? "pending" : "waived",
    historicalBonus,
    historicalSummary: {
      seasonsWithOrg: seasons.size,
      totalGamesPlayed: present,
      attendanceRate,
    },
  });

  return NextResponse.json({
    registration,
    tryoutNumber,
    paymentRequired: p.fee > 0,
    fee: p.fee,
    message: `${playerName} registered as #${tryoutNumber}`,
  }, { status: 201 });
}
