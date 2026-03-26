export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/divisions — list divisions for this event
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const divisions = await tenant.models.Division.find({
    eventId: new Types.ObjectId(params.id),
  })
    .sort({ sortOrder: 1 })
    .lean();

  return NextResponse.json(divisions);
}

// POST /api/events/[id]/divisions — create a division for this event
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();

  const division = await tenant.models.Division.create({
    eventId: new Types.ObjectId(params.id),
    key: body.key,
    label: body.label,
    sport: body.sport || "7v7_football",
    minAge: body.minAge,
    maxAge: body.maxAge,
    ageCutoffDate: body.ageCutoffDate ? new Date(body.ageCutoffDate) : undefined,
    gradeBasedEligibility: body.gradeBasedEligibility || false,
    skillLevel: body.skillLevel,
    skillLevelLabel: body.skillLevelLabel,
    eventFormat: body.eventFormat || "round_robin",
    minPoolGamesPerTeam: body.minPoolGamesPerTeam ?? 3,
    poolCount: body.poolCount || undefined,
    teamsAdvancingPerPool: body.teamsAdvancingPerPool ?? 2,
    pools: body.pools || [],
    bracketType: body.bracketType || "single_elimination",
    maxTeams: body.maxTeams,
    estimatedTeamCount: body.estimatedTeamCount || undefined,
    isActive: true,
    sortOrder: body.sortOrder ?? 0,
  });

  // Add division to event's divisionIds
  await tenant.models.Event.findByIdAndUpdate(params.id, {
    $addToSet: { divisionIds: division._id },
  });

  return NextResponse.json(division, { status: 201 });
}
