export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";

/**
 * GET /api/family/players/[playerId] — get a single player with full detail
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const player = await models.FamilyPlayer.findById(params.playerId).lean();
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const verifications = await models.VerificationRecord.find({
    playerId: new Types.ObjectId(params.playerId),
  }).lean();

  return NextResponse.json({ player, verifications });
}

/**
 * PATCH /api/family/players/[playerId] — update player profile
 *
 * Accepts: sizing, sports, medical, emergencyContacts, socials, heightInches, weightLbs
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const body = await req.json();
  const conn = await connectFamilyDB(familyId);
  const { FamilyPlayer } = getFamilyModels(conn);

  // Build safe update (only allow known fields)
  const allowed = [
    "firstName", "lastName", "dateOfBirth", "gender",
    "sizing", "heightInches", "weightLbs",
    "emergencyContacts", "medical", "sports", "socials",
  ];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const updated = await FamilyPlayer.findByIdAndUpdate(
    params.playerId,
    { $set: update },
    { new: true },
  ).lean();

  if (!updated) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(updated);
}
