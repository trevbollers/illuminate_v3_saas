export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels, connectPlatformDB, Player } from "@goparticipate/db";

// GET /api/roster — cross-team roster view: all players across all org teams
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  // Get all active teams
  const teams = await models.Team.find({ isActive: true })
    .select("name sport divisionKey season")
    .lean();

  const teamMap = new Map(
    (teams as any[]).map((t) => [t._id.toString(), { name: t.name, sport: t.sport, divisionKey: t.divisionKey }]),
  );

  // Get all roster entries (all statuses for full view)
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "active";
  const rosterFilter: any = {};
  if (statusFilter !== "all") {
    rosterFilter.status = statusFilter;
  }

  const rosterEntries = await models.Roster.find(rosterFilter)
    .sort({ playerName: 1 })
    .lean();

  // Collect unique player IDs and fetch platform player data for age/medical
  const playerIds = [...new Set((rosterEntries as any[]).map((r) => r.playerId.toString()))];

  await connectPlatformDB();
  const players = await Player.find({ _id: { $in: playerIds } })
    .select("firstName lastName dateOfBirth gender emergencyContacts medical verificationStatus")
    .lean();

  const playerMap = new Map(
    (players as any[]).map((p) => [p._id.toString(), p]),
  );

  const result = (rosterEntries as any[]).map((r) => {
    const team = teamMap.get(r.teamId.toString());
    const player = playerMap.get(r.playerId.toString());
    const age = player?.dateOfBirth
      ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    return {
      _id: r._id.toString(),
      playerId: r.playerId.toString(),
      playerName: r.playerName,
      jerseyNumber: r.jerseyNumber,
      position: r.position,
      status: r.status,
      joinedAt: r.joinedAt,
      teamId: r.teamId.toString(),
      teamName: team?.name || "Unknown",
      teamSport: team?.sport,
      teamDivision: team?.divisionKey,
      age,
      dateOfBirth: player?.dateOfBirth,
      gender: player?.gender,
      hasEmergencyContact: (player?.emergencyContacts?.length || 0) > 0,
      hasMedicalNotes: !!player?.medical?.notes,
      verificationStatus: player?.verificationStatus || "unverified",
    };
  });

  return NextResponse.json({
    roster: result,
    teams: (teams as any[]).map((t) => ({
      _id: t._id.toString(),
      name: t.name,
      sport: t.sport,
      divisionKey: t.divisionKey,
    })),
  });
}
