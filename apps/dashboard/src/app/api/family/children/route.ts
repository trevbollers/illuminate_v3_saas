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
  })
    .select("firstName lastName dateOfBirth photo verificationStatus")
    .lean();

  if (players.length === 0) {
    return NextResponse.json({ children: [] });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Roster, Team } = getOrgModels(conn);

  const playerIds = players.map((p) => p._id);
  const rosterEntries = await Roster.find({
    playerId: { $in: playerIds },
    status: { $in: ["active", "injured"] },
  })
    .select("playerId teamId jerseyNumber position status")
    .lean();

  const teamIds = [...new Set(rosterEntries.map((r) => r.teamId.toString()))];
  const teams = await Team.find({ _id: { $in: teamIds } })
    .select("name sport season divisionKey")
    .lean();
  const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));

  const children = players.map((player) => {
    const playerRosters = rosterEntries.filter(
      (r) => r.playerId.toString() === player._id.toString(),
    );
    const teamAssignments = playerRosters.map((r) => {
      const team = teamMap.get(r.teamId.toString());
      return {
        teamId: r.teamId.toString(),
        teamName: team?.name || "Unknown Team",
        sport: team?.sport || "",
        season: team?.season || "",
        jerseyNumber: r.jerseyNumber,
        position: r.position,
        rosterStatus: r.status,
      };
    });

    const age = player.dateOfBirth
      ? Math.floor((Date.now() - new Date(player.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    return {
      _id: player._id.toString(),
      firstName: player.firstName,
      lastName: player.lastName,
      age,
      photo: player.photo,
      verificationStatus: player.verificationStatus,
      teams: teamAssignments,
    };
  });

  return NextResponse.json({ children });
}
