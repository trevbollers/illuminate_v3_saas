export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectPlatformDB, Player, Family } from "@goparticipate/db";

// GET /api/players — search platform players (for adding to rosters)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const familyOnly = searchParams.get("familyOnly") === "true";

  await connectPlatformDB();

  const filter: any = { isActive: true };

  if (familyOnly) {
    // Find user's family
    const user = await (await import("@goparticipate/db")).User.findById(userId).select("familyId").lean();
    if ((user as any)?.familyId) filter.familyId = (user as any).familyId;
    else return NextResponse.json([]);
  } else if (query.length >= 2) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
    ];
  } else {
    return NextResponse.json([]);
  }

  const players = await Player.find(filter)
    .select("firstName lastName dateOfBirth gender photo familyId emergencyContacts medical verificationStatus")
    .sort({ lastName: 1, firstName: 1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    players.map((p: any) => ({
      _id: p._id.toString(),
      firstName: p.firstName,
      lastName: p.lastName,
      name: `${p.firstName} ${p.lastName}`,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      photo: p.photo,
      familyId: p.familyId?.toString(),
      emergencyContacts: p.emergencyContacts || [],
      medical: p.medical || {},
      verificationStatus: p.verificationStatus || "unverified",
    })),
  );
}

// POST /api/players — create a new player in the platform DB
// Also creates/updates family grouping and links guardian
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    jerseyNumber,
    position,
    teamId,
    guardianName,
    guardianEmail,
    guardianPhone,
    emergencyContacts,
    medical,
    familyId: existingFamilyId,
  } = body;

  if (!firstName || !lastName || !dateOfBirth) {
    return NextResponse.json(
      { error: "Missing required fields: firstName, lastName, dateOfBirth" },
      { status: 400 },
    );
  }

  await connectPlatformDB();

  const userOid = new Types.ObjectId(userId);

  // Resolve or create family
  let familyId: Types.ObjectId;
  if (existingFamilyId && Types.ObjectId.isValid(existingFamilyId)) {
    familyId = new Types.ObjectId(existingFamilyId);
    // Ensure the current user is a guardian in this family
    const family = await Family.findById(familyId).lean();
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }
  } else {
    // Check if user has a familyId
    const currentUser = await (await import("@goparticipate/db")).User.findById(userId).select("familyId").lean();
    if ((currentUser as any)?.familyId) {
      familyId = new Types.ObjectId((currentUser as any).familyId);
    } else {
      // Create a new family for this guardian
      const familyName = guardianName
        ? `${guardianName.split(" ").pop() || guardianName} Family`
        : `${lastName} Family`;
      const family = await Family.create({
        name: familyName,
        guardianUserIds: [userOid],
        playerIds: [],
      });
      familyId = family._id;
    }
  }

  // Create player
  const player = await Player.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    dateOfBirth: new Date(dateOfBirth),
    gender: gender || undefined,
    familyId,
    guardianUserIds: [userOid],
    emergencyContacts: emergencyContacts || [],
    medical: medical || {},
    verificationStatus: "unverified",
    isActive: true,
  });

  // Add player to family's playerIds
  await Family.findByIdAndUpdate(familyId, {
    $addToSet: { playerIds: player._id, guardianUserIds: userOid },
  });

  return NextResponse.json(
    {
      _id: player._id.toString(),
      firstName: player.firstName,
      lastName: player.lastName,
      name: `${player.firstName} ${player.lastName}`,
      dateOfBirth: player.dateOfBirth,
      gender: player.gender,
      familyId: player.familyId.toString(),
      emergencyContacts: player.emergencyContacts,
      medical: player.medical,
      verificationStatus: player.verificationStatus,
      // Pass through for roster creation on the client side
      _teamId: teamId,
      _jerseyNumber: jerseyNumber,
      _position: position,
    },
    { status: 201 },
  );
}
