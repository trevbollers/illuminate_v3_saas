export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, connectPlatformDB, registerOrgModels, getOrgModels, Player } from "@goparticipate/db";

export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const players = await Player.find({
    guardianUserIds: new Types.ObjectId(userId),
    isActive: true,
  }).select("_id").lean();

  const childCount = players.length;
  if (childCount === 0) {
    return NextResponse.json({ childCount: 0, teamCount: 0, upcomingEventCount: 0, unreadMessageCount: 0 });
  }

  const playerIds = players.map((p) => p._id);
  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Roster, OrgEvent, Message } = getOrgModels(conn);

  const rosterEntries = await Roster.find({
    playerId: { $in: playerIds },
    status: { $in: ["active", "injured"] },
  }).select("teamId").lean();

  const teamIds = [...new Set(rosterEntries.map((r) => r.teamId.toString()))];

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingEventCount = await OrgEvent.countDocuments({
    teamId: { $in: teamIds.map((id) => new Types.ObjectId(id)) },
    startTime: { $gte: now, $lte: weekFromNow },
    isCancelled: { $ne: true },
  });

  const unreadMessageCount = await Message.countDocuments({
    recipientUserIds: new Types.ObjectId(userId),
    readBy: { $ne: new Types.ObjectId(userId) },
  });

  return NextResponse.json({
    childCount,
    teamCount: teamIds.length,
    upcomingEventCount,
    unreadMessageCount,
  });
}
