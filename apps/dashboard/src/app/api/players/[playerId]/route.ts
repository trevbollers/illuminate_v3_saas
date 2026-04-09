export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectPlatformDB, Player } from "@goparticipate/db";

// GET /api/players/[playerId] — get full player details
export async function GET(
  _req: Request,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const h = await headers();
  if (!h.get("x-user-id")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!Types.ObjectId.isValid(params.playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  await connectPlatformDB();

  const player = await Player.findById(params.playerId)
    .select("firstName lastName dateOfBirth gender photo familyId guardianUserIds emergencyContacts medical verificationStatus isActive")
    .lean();

  if (!player || !(player as any).isActive) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const p = player as any;
  return NextResponse.json({
    _id: p._id.toString(),
    firstName: p.firstName,
    lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    photo: p.photo,
    familyId: p.familyId?.toString(),
    guardianUserIds: (p.guardianUserIds || []).map((id: any) => id.toString()),
    emergencyContacts: p.emergencyContacts || [],
    medical: p.medical || {},
    verificationStatus: p.verificationStatus || "unverified",
  });
}

// PUT /api/players/[playerId] — update player info (medical, emergency contacts, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const h = await headers();
  if (!h.get("x-user-id")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!Types.ObjectId.isValid(params.playerId)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  await connectPlatformDB();

  const player = await Player.findById(params.playerId);
  if (!player || !player.isActive) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: any = {};

  // Basic info
  if (body.firstName !== undefined) updates.firstName = body.firstName.trim();
  if (body.lastName !== undefined) updates.lastName = body.lastName.trim();
  if (body.dateOfBirth !== undefined) updates.dateOfBirth = new Date(body.dateOfBirth);
  if (body.gender !== undefined) updates.gender = body.gender || undefined;

  // Emergency contacts — replace entire array
  if (body.emergencyContacts !== undefined) {
    updates.emergencyContacts = (body.emergencyContacts || []).map((c: any) => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    }));
  }

  // Medical notes — single notes field for critical info only
  if (body.medical !== undefined) {
    updates.medical = {
      notes: body.medical.notes ?? player.medical?.notes,
    };
  }

  const updated = await Player.findByIdAndUpdate(
    params.playerId,
    { $set: updates },
    { new: true },
  ).lean();

  const p = updated as any;
  return NextResponse.json({
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
  });
}
