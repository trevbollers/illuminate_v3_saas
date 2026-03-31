export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";

/**
 * POST /api/family/players — add a player to the family
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) {
    return NextResponse.json({ error: "Create a family first" }, { status: 400 });
  }

  const body = await req.json();
  const { firstName, lastName, dateOfBirth, gender, sports } = body;

  if (!firstName || !lastName || !dateOfBirth) {
    return NextResponse.json({ error: "firstName, lastName, and dateOfBirth required" }, { status: 400 });
  }

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const player = await models.FamilyPlayer.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    dateOfBirth: new Date(dateOfBirth),
    gender: gender || "other",
    photos: [],
    sizing: {},
    emergencyContacts: [],
    medical: {},
    sports: sports || [],
    teamHistory: [],
    verificationStatus: "unverified",
    socials: {},
    isActive: true,
  });

  // Link player to the guardian
  await models.FamilyGuardian.updateOne(
    { userId: new Types.ObjectId(session.user.id) },
    { $addToSet: { playerIds: player._id } },
  );

  return NextResponse.json(player, { status: 201 });
}
