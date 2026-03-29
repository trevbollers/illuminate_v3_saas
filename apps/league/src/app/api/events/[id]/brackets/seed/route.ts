export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

/**
 * POST /api/events/[id]/brackets/seed
 *
 * Seeds bracket shells with real team names from pool play standings.
 * Flow: pool play completes → admin recalculates standings → admin clicks
 * "Seed Brackets" → this endpoint fills bracket slots based on rank.
 *
 * Body: { divisionId: string }
 *
 * For each bracket tier in the division:
 *   - Reads standings ranked by pool play results
 *   - Assigns teams to bracket slots in seed order
 *   - Replaces "Seed 1", "Seed 2", etc. with actual team names
 *   - Auto-completes BYE matches and advances winners
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = params;
  if (!Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();
  const { divisionId } = body;

  if (!divisionId || !Types.ObjectId.isValid(divisionId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const { Bracket, Standing, Division } = tenant.models;

  const division = await Division.findById(divisionId).lean();
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Get standings for this division, ranked
  const standings = await Standing.find({
    eventId,
    divisionId,
  })
    .sort({ rank: 1 })
    .lean();

  if (standings.length === 0) {
    return NextResponse.json(
      { error: "No standings found — recalculate standings from pool play first" },
      { status: 400 },
    );
  }

  // Get all draft brackets for this division
  const brackets = await Bracket.find({
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(divisionId),
    status: "draft",
  }).sort({ createdAt: 1 });

  if (brackets.length === 0) {
    return NextResponse.json(
      { error: "No draft brackets found — generate bracket shells first" },
      { status: 400 },
    );
  }

  const tiers = (division as any).bracketTiers || [];
  const rankedTeams = (standings as any[]).map((s) => ({
    name: s.teamName,
    id: s.teamId,
  }));

  let teamOffset = 0;
  const results = [];

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i]!;
    const tier = tiers[i];
    const tierTeamCount = tier?.teamCount || bracket.matches.filter((m: any) => m.round === 1).length * 2;

    // Slice the ranked teams for this tier
    const tierTeams = rankedTeams.slice(teamOffset, teamOffset + tierTeamCount);
    teamOffset += tierTeamCount;

    if (tierTeams.length === 0) continue;

    // Build a seed-to-team mapping
    const seedMap = new Map<string, { name: string; id?: string }>();
    for (let s = 0; s < tierTeams.length; s++) {
      seedMap.set(`Seed ${s + 1}`, tierTeams[s]!);
    }

    // Replace placeholder names in all matches
    for (const match of bracket.matches as any[]) {
      if (match.homeTeamName && seedMap.has(match.homeTeamName)) {
        const team = seedMap.get(match.homeTeamName)!;
        match.homeTeamName = team.name;
        if (team.id) match.homeTeamId = team.id;
      }
      if (match.awayTeamName && seedMap.has(match.awayTeamName)) {
        const team = seedMap.get(match.awayTeamName)!;
        match.awayTeamName = team.name;
        if (team.id) match.awayTeamId = team.id;
      }

      // Re-process BYE matches after team names are filled
      if (match.isBye && match.status === "completed") {
        const winner = match.homeTeamName === "BYE" ? match.awayTeamName : match.homeTeamName;
        const winnerId = match.homeTeamName === "BYE" ? match.awayTeamId : match.homeTeamId;
        if (winner && match.nextMatchNumber) {
          const nextMatch = (bracket.matches as any[]).find(
            (m: any) => m.matchNumber === match.nextMatchNumber,
          );
          if (nextMatch) {
            if (match.nextSlot === "home") {
              nextMatch.homeTeamName = winner;
              if (winnerId) nextMatch.homeTeamId = winnerId;
            } else {
              nextMatch.awayTeamName = winner;
              if (winnerId) nextMatch.awayTeamId = winnerId;
            }
          }
        }
      }
    }

    bracket.markModified("matches");
    await bracket.save();
    results.push(bracket.toObject());
  }

  return NextResponse.json({
    seeded: true,
    teamsAssigned: teamOffset,
    brackets: results,
  });
}
