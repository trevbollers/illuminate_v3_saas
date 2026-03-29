export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectTenantDB,
  connectPlatformDB,
  getOrgModels,
  Player,
} from "@goparticipate/db";

/**
 * GET /api/family/schedule
 * Returns upcoming events for all of this parent's children's teams.
 * Cross-DB: platform (players) → org (roster → team → events)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "14", 10);

  // 1. Get children's player IDs
  await connectPlatformDB();
  const players = await Player.find({
    guardianUserIds: new Types.ObjectId(userId),
    isActive: true,
  })
    .select("_id firstName lastName")
    .lean();

  if (players.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const playerIds = players.map((p) => p._id);

  // 2. Get team IDs from roster
  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Roster, Team, OrgEvent } = getOrgModels(conn);

  const rosterEntries = await Roster.find({
    playerId: { $in: playerIds },
    status: { $in: ["active", "injured"] },
  })
    .select("playerId teamId")
    .lean();

  const teamIds = [...new Set(rosterEntries.map((r) => r.teamId.toString()))];
  if (teamIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Build player→teams map for labeling
  const playerTeamMap = new Map<string, string[]>();
  for (const r of rosterEntries) {
    const pid = r.playerId.toString();
    if (!playerTeamMap.has(pid)) playerTeamMap.set(pid, []);
    playerTeamMap.get(pid)!.push(r.teamId.toString());
  }

  // 3. Get teams for names
  const teams = await Team.find({ _id: { $in: teamIds.map((id) => new Types.ObjectId(id)) } })
    .select("name")
    .lean();
  const teamNameMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

  // 4. Get upcoming events for these teams
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = await OrgEvent.find({
    teamId: { $in: teamIds.map((id) => new Types.ObjectId(id)) },
    startTime: { $gte: now, $lte: endDate },
    isCancelled: { $ne: true },
  })
    .sort({ startTime: 1 })
    .lean();

  // 5. Enrich events with team name and which children are on that team
  const enriched = events.map((event) => {
    const eventTeamId = event.teamId.toString();
    const teamName = teamNameMap.get(eventTeamId) || "Unknown Team";

    // Find which children are on this team
    const childrenOnTeam = players
      .filter((p) => {
        const pTeams = playerTeamMap.get(p._id.toString()) || [];
        return pTeams.includes(eventTeamId);
      })
      .map((p) => ({ id: p._id.toString(), name: `${p.firstName} ${p.lastName}` }));

    return {
      _id: event._id.toString(),
      teamId: eventTeamId,
      teamName,
      title: event.title,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      opponentName: event.opponentName,
      homeAway: event.homeAway,
      children: childrenOnTeam,
    };
  });

  return NextResponse.json({ events: enriched });
}
