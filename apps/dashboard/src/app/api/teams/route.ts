export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/teams — list teams for this org
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const models = getOrgModels(conn);

  const teams = await models.Team.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  // Get roster counts per team
  const teamIds = teams.map((t: any) => t._id);
  const rosterCounts = await models.Roster.aggregate([
    { $match: { teamId: { $in: teamIds }, status: "active" } },
    { $group: { _id: "$teamId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(rosterCounts.map((r: any) => [r._id.toString(), r.count]));

  const result = teams.map((t: any) => ({
    _id: t._id,
    name: t.name,
    divisionKey: t.divisionKey,
    sport: t.sport,
    season: t.season,
    headCoachId: t.headCoachId,
    isActive: t.isActive,
    playerCount: countMap.get(t._id.toString()) || 0,
    createdAt: t.createdAt,
  }));

  return NextResponse.json(result);
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, sport, divisionKey, season } = body;

  if (!name || !sport || !divisionKey) {
    return NextResponse.json(
      { error: "Missing required fields: name, sport, divisionKey" },
      { status: 400 },
    );
  }

  const conn = await connectTenantDB(slug, "organization");
  const models = getOrgModels(conn);

  const team = await models.Team.create({
    name,
    sport,
    divisionKey,
    season: season || undefined,
    headCoachId: new Types.ObjectId(userId),
    coachIds: [],
    managerIds: [],
    isActive: true,
  });

  return NextResponse.json(team, { status: 201 });
}
