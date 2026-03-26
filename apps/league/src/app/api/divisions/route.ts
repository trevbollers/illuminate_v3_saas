export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/divisions — list league-wide division templates (no eventId)
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const divisions = await tenant.models.Division.find({ eventId: { $exists: false } })
    .sort({ sortOrder: 1 })
    .lean();

  return NextResponse.json(divisions);
}

// POST /api/divisions — create a league-wide division template
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const division = await tenant.models.Division.create({
    // No eventId — this is a league-wide template
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
    teamsAdvancingPerPool: body.teamsAdvancingPerPool ?? 2,
    bracketType: body.bracketType || "single_elimination",
    maxTeams: body.maxTeams,
    estimatedTeamCount: body.estimatedTeamCount || undefined,
    isActive: body.isActive ?? true,
    sortOrder: body.sortOrder ?? 0,
  });

  return NextResponse.json(division, { status: 201 });
}
