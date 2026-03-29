export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectTenantDB,
  connectPlatformDB,
  getOrgModels,
  Player,
} from "@goparticipate/db";

/**
 * GET /api/family/summary
 * Returns a quick summary for the parent dashboard:
 * - childCount, teamCount, upcomingEventCount, unreadMessageCount
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 1. Count children
  await connectPlatformDB();
  const players = await Player.find({
    guardianUserIds: new Types.ObjectId(userId),
    isActive: true,
  })
    .select("_id")
    .lean();

  const childCount = players.length;

  if (childCount === 0) {
    return NextResponse.json({
      childCount: 0,
      teamCount: 0,
      upcomingEventCount: 0,
      unreadMessageCount: 0,
    });
  }

  const playerIds = players.map((p) => p._id);

  // 2. Count teams from roster
  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Roster, OrgEvent, Message } = getOrgModels(conn);

  const rosterEntries = await Roster.find({
    playerId: { $in: playerIds },
    status: { $in: ["active", "injured"] },
  })
    .select("teamId")
    .lean();

  const teamIds = [...new Set(rosterEntries.map((r) => r.teamId.toString()))];
  const teamCount = teamIds.length;

  // 3. Count upcoming events (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingEventCount = await OrgEvent.countDocuments({
    teamId: { $in: teamIds.map((id) => new Types.ObjectId(id)) },
    startTime: { $gte: now, $lte: weekFromNow },
    isCancelled: { $ne: true },
  });

  // 4. Unread messages for this parent
  const unreadMessageCount = await Message.countDocuments({
    recipientUserIds: new Types.ObjectId(userId),
    readBy: { $ne: new Types.ObjectId(userId) },
  });

  return NextResponse.json({
    childCount,
    teamCount,
    upcomingEventCount,
    unreadMessageCount,
  });
}
