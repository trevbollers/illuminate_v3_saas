export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";
import {
  generateBracketMatches,
  seedBracket,
  getBracketOrder,
  type SeedTeam,
  type BracketMatch,
} from "@goparticipate/db/src/utils/bracket-generator";

// GET /api/events/[id]/brackets — list brackets for an event
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const brackets = await tenant.models.Bracket.find({
    eventId: new Types.ObjectId(params.id),
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json(brackets);
}

// POST /api/events/[id]/brackets — create/generate bracket(s) for a division
//
// Modes:
//   1. Standard: { divisionId, type?, seedTeams? } — single bracket for division
//   2. Tier-based: { divisionId, fromTiers: true } — reads division.bracketTiers,
//      generates one pre-rendered bracket shell per tier (Gold, Silver, etc.)
//
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
  const { divisionId, type, seedTeams, fromTiers } = body;

  if (!divisionId || !Types.ObjectId.isValid(divisionId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const division = await tenant.models.Division.findById(divisionId).lean();
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Delete existing brackets for this division (regeneration)
  await tenant.models.Bracket.deleteMany({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
  });

  // ─── Tier-based pre-render mode ───
  if (fromTiers) {
    const tiers = (division as any).bracketTiers;
    if (!tiers || tiers.length === 0) {
      return NextResponse.json(
        { error: "Division has no bracket tiers defined" },
        { status: 400 },
      );
    }

    // Optionally pull registered teams to seed tiers
    const regs = await tenant.models.Registration.find({
      eventId: new Types.ObjectId(params.id),
      divisionId: new Types.ObjectId(divisionId),
      status: "approved",
    }).lean();

    const allTeams = regs.map((r: any, i: number) => ({
      name: r.teamName,
      seed: i + 1,
    }));

    const brackets = [];
    let teamOffset = 0;

    for (const tier of tiers) {
      const tierTeamCount = tier.teamCount || 4;
      const tierBracketType = tier.bracketType || "single_elimination";

      // Assign teams to this tier if we have enough registered teams
      let tierTeams: SeedTeam[] = [];
      if (allTeams.length >= teamOffset + tierTeamCount) {
        tierTeams = allTeams.slice(teamOffset, teamOffset + tierTeamCount).map(
          (t: any, i: number) => ({ name: t.name, seed: i + 1 }),
        );
      }
      // If not enough teams yet, generate empty shells (pre-render)
      const matches = generateBracketMatches(tierTeams, tierBracketType, tierTeamCount);

      const bracket = await tenant.models.Bracket.create({
        eventId: new Types.ObjectId(params.id),
        divisionId: new Types.ObjectId(divisionId),
        name: `${(division as any).label} — ${tier.name} Bracket`,
        type: tierBracketType,
        matches,
        status: "draft",
        createdBy: new Types.ObjectId(tenant.userId),
      });

      brackets.push(bracket.toObject());
      teamOffset += tierTeamCount;
    }

    return NextResponse.json(brackets, { status: 201 });
  }

  // ─── Standard single-bracket mode ───
  const bracketType = type || (division as any).bracketType || "single_elimination";

  let teams: SeedTeam[] = [];

  if (seedTeams && seedTeams.length > 0) {
    teams = seedTeams.map((t: any, i: number) => ({
      name: t.name || t,
      seed: t.seed || i + 1,
    }));
  } else {
    // Pull from approved OR pending registrations (teams may not be approved yet)
    const regs = await tenant.models.Registration.find({
      eventId: new Types.ObjectId(params.id),
      divisionId: new Types.ObjectId(divisionId),
      status: { $in: ["approved", "pending"] },
    }).lean();

    teams = regs.map((r: any, i: number) => ({
      name: r.teamName,
      seed: i + 1,
    }));
  }

  // If we have teams, generate a bracket with real team names
  // If not, fall back to pre-rendered shell from estimatedTeamCount
  let matches;
  let bracketName: string;
  const divLabel = (division as any).label;

  if (teams.length >= 2) {
    matches = generateBracketMatches(teams, bracketType);
    bracketName = `${divLabel} ${bracketType === "double_elimination" ? "Double Elimination" : bracketType === "consolation" ? "Consolation Bracket" : "Bracket"}`;
  } else {
    // Pre-render shell from estimatedTeamCount or maxTeams
    const estimated = (division as any).estimatedTeamCount || (division as any).maxTeams;
    if (!estimated || estimated < 2) {
      return NextResponse.json(
        { error: "No registered teams and no estimatedTeamCount set on division" },
        { status: 400 },
      );
    }
    matches = generateBracketMatches([], bracketType, estimated);
    bracketName = `${divLabel} Bracket (Projected ${estimated} teams)`;
  }

  const bracket = await tenant.models.Bracket.create({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
    name: bracketName,
    type: bracketType,
    matches,
    status: "draft",
    createdBy: new Types.ObjectId(tenant.userId),
  });

  return NextResponse.json(bracket, { status: 201 });
}

// Pure functions imported from @goparticipate/db/src/utils/bracket-generator
