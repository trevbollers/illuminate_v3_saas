export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels, connectPlatformDB, Player } from "@goparticipate/db";

// GET /api/rsvp?eventId=xxx — get RSVP status for the logged-in parent's children
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Attendance } = getOrgModels(conn);

  await connectPlatformDB();
  const players = await Player.find({
    guardianUserIds: new Types.ObjectId(userId),
  })
    .select("_id firstName lastName")
    .lean();

  const playerIds = players.map((p: any) => p._id);

  const records = await Attendance.find({
    eventId: new Types.ObjectId(eventId),
    playerId: { $in: playerIds },
  })
    .select("playerId playerName rsvp status")
    .lean();

  return NextResponse.json({
    players: players.map((p: any) => {
      const record = records.find((r: any) => r.playerId?.toString() === p._id.toString());
      return {
        playerId: p._id.toString(),
        name: `${p.firstName} ${p.lastName}`,
        rsvp: record?.rsvp || "no_response",
      };
    }),
  });
}

// PATCH /api/rsvp — update RSVP { eventId, playerId, rsvp: "yes"|"no"|"maybe" }
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { eventId, playerId, rsvp } = body;

  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
  }
  if (!playerId || !Types.ObjectId.isValid(playerId)) {
    return NextResponse.json({ error: "Invalid playerId" }, { status: 400 });
  }
  if (!["yes", "no", "maybe"].includes(rsvp)) {
    return NextResponse.json({ error: "rsvp must be yes, no, or maybe" }, { status: 400 });
  }

  await connectPlatformDB();
  const player = await Player.findOne({
    _id: new Types.ObjectId(playerId),
    guardianUserIds: new Types.ObjectId(userId),
  }).lean();

  if (!player) {
    return NextResponse.json({ error: "Player not found or not yours" }, { status: 403 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Attendance } = getOrgModels(conn);

  const updated = await Attendance.findOneAndUpdate(
    {
      eventId: new Types.ObjectId(eventId),
      playerId: new Types.ObjectId(playerId),
    },
    {
      $set: { rsvp },
      $setOnInsert: {
        playerName: `${(player as any).firstName} ${(player as any).lastName}`,
        status: "absent",
      },
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json(updated);
}
