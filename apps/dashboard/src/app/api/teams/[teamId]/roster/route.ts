export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels, connectPlatformDB, Player } from "@goparticipate/db";

// GET /api/teams/[teamId]/roster — get active roster for a team
export async function GET(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const roster = await models.Roster.find({
    teamId: new Types.ObjectId(params.teamId),
    status: "active",
  })
    .sort({ playerName: 1 })
    .lean();

  return NextResponse.json(roster);
}

// POST /api/teams/[teamId]/roster — add a player to the team roster
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const body = await req.json();
  const { playerId, playerName, jerseyNumber, position } = body;

  if (!playerId || !playerName) {
    return NextResponse.json(
      { error: "Missing required fields: playerId, playerName" },
      { status: 400 },
    );
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  // Verify team exists
  const team = await models.Team.findById(params.teamId).lean();
  if (!team || !(team as any).isActive) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check for duplicate
  const existing = await models.Roster.findOne({
    teamId: new Types.ObjectId(params.teamId),
    playerId: new Types.ObjectId(playerId),
    status: "active",
  }).lean();

  if (existing) {
    return NextResponse.json(
      { error: "Player is already on this team's roster" },
      { status: 409 },
    );
  }

  // Check jersey number conflict
  if (jerseyNumber != null && jerseyNumber !== "") {
    const jerseyNum = typeof jerseyNumber === "string" ? parseInt(jerseyNumber, 10) : jerseyNumber;
    if (!isNaN(jerseyNum)) {
      const conflict = await models.Roster.findOne({
        teamId: new Types.ObjectId(params.teamId),
        jerseyNumber: jerseyNum,
        status: "active",
      }).lean();

      if (conflict) {
        return NextResponse.json(
          { error: `Jersey #${jerseyNum} is already assigned to ${(conflict as any).playerName}` },
          { status: 409 },
        );
      }
    }
  }

  const entry = await models.Roster.create({
    teamId: new Types.ObjectId(params.teamId),
    playerId: new Types.ObjectId(playerId),
    playerName,
    jerseyNumber: jerseyNumber || undefined,
    position: position || undefined,
    status: "active",
    joinedAt: new Date(),
  });

  return NextResponse.json(entry, { status: 201 });
}

// DELETE /api/teams/[teamId]/roster — remove a player from roster
export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rosterId = searchParams.get("rosterId");

  if (!rosterId || !Types.ObjectId.isValid(rosterId)) {
    return NextResponse.json({ error: "Invalid roster entry ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  await models.Roster.findByIdAndUpdate(rosterId, {
    $set: { status: "inactive", leftAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
