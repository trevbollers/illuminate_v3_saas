export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";
import { Types } from "mongoose";

/**
 * GET /api/family — get family profile, players, connections, verification status
 *
 * Reads from the user's family DB. If no familyId exists on the user,
 * returns { hasFamily: false } so the UI can prompt family creation.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId name email").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const familyId = (user as any).familyId?.toString();
  if (!familyId) {
    return NextResponse.json({ hasFamily: false, user: { name: (user as any).name, email: (user as any).email } });
  }

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const [profile, guardians, players, verifications] = await Promise.all([
    models.FamilyProfile.findOne().lean(),
    models.FamilyGuardian.find().lean(),
    models.FamilyPlayer.find({ isActive: true }).sort({ firstName: 1 }).lean(),
    models.VerificationRecord.find({ status: "verified" }).lean(),
  ]);

  // Build verification map: playerId → records
  const verificationMap: Record<string, any[]> = {};
  for (const v of verifications as any[]) {
    const pid = v.playerId.toString();
    if (!verificationMap[pid]) verificationMap[pid] = [];
    verificationMap[pid].push(v);
  }

  // Enrich players with verification info
  const enrichedPlayers = (players as any[]).map((p) => ({
    ...p,
    _id: p._id.toString(),
    verifications: verificationMap[p._id.toString()] || [],
    age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
  }));

  return NextResponse.json({
    hasFamily: true,
    familyId,
    profile,
    guardians,
    players: enrichedPlayers,
  });
}

/**
 * PATCH /api/family — update family profile (address, preferences, name)
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) {
    return NextResponse.json({ error: "No family found" }, { status: 404 });
  }

  const body = await req.json();
  const conn = await connectFamilyDB(familyId);
  const { FamilyProfile } = getFamilyModels(conn);

  const updated = await FamilyProfile.findOneAndUpdate(
    {},
    { $set: body },
    { new: true },
  ).lean();

  return NextResponse.json(updated);
}

/**
 * POST /api/family — create a new family (first-time setup)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user already has a family
  if ((user as any).familyId) {
    return NextResponse.json({ error: "Family already exists" }, { status: 409 });
  }

  const body = await req.json();
  const familyId = new Types.ObjectId();

  // Create family DB and initial profile
  const conn = await connectFamilyDB(familyId.toString());
  const models = getFamilyModels(conn);

  const profile = await models.FamilyProfile.create({
    familyName: body.familyName || `${(user as any).name}'s Family`,
    primaryUserId: new Types.ObjectId(session.user.id),
    address: body.address || {},
    orgConnections: [],
    leagueConnections: [],
    programHistory: [],
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      shareVerificationAcrossLeagues: true,
    },
  });

  // Create guardian record for this user
  await models.FamilyGuardian.create({
    userId: new Types.ObjectId(session.user.id),
    name: (user as any).name,
    email: (user as any).email,
    phone: (user as any).phone,
    relationship: body.relationship || "guardian",
    isPrimary: true,
    canMakeDecisions: true,
    playerIds: [],
  });

  // Link familyId to user
  await User.findByIdAndUpdate(session.user.id, { $set: { familyId } });

  return NextResponse.json({
    familyId: familyId.toString(),
    profile,
  }, { status: 201 });
}
