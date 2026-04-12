export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, connectPlatformDB, registerOrgModels, getOrgModels, Player } from "@goparticipate/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = parseInt(new URL(req.url).searchParams.get("days") || "14", 10);

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
  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
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

  const playerTeamMap = new Map<string, string[]>();
  for (const r of rosterEntries) {
    const pid = r.playerId.toString();
    if (!playerTeamMap.has(pid)) playerTeamMap.set(pid, []);
    playerTeamMap.get(pid)!.push(r.teamId.toString());
  }

  const teams = await Team.find({ _id: { $in: teamIds.map((id) => new Types.ObjectId(id)) } })
    .select("name")
    .lean();
  const teamNameMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = await OrgEvent.find({
    teamId: { $in: teamIds.map((id) => new Types.ObjectId(id)) },
    startTime: { $gte: now, $lte: endDate },
    isCancelled: { $ne: true },
  })
    .sort({ startTime: 1 })
    .lean();

  const enriched = events.map((event) => {
    const eventTeamId = event.teamId?.toString() ?? "";
    const childrenOnTeam = players
      .filter((p) => (playerTeamMap.get(p._id.toString()) || []).includes(eventTeamId))
      .map((p) => ({ id: p._id.toString(), name: `${p.firstName} ${p.lastName}` }));

    return {
      _id: event._id.toString(),
      teamId: eventTeamId,
      teamName: teamNameMap.get(eventTeamId) || "Unknown Team",
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
