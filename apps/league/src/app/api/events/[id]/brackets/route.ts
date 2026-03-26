export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

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

// POST /api/events/[id]/brackets — create/generate a bracket for a division
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
  const { divisionId, type, seedTeams } = body;

  if (!divisionId || !Types.ObjectId.isValid(divisionId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const division = await tenant.models.Division.findById(divisionId).lean();
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Delete existing bracket for this division (regeneration)
  await tenant.models.Bracket.deleteMany({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
  });

  const bracketType = type || division.bracketType || "single_elimination";

  // Determine teams: explicit seeds, registered teams, or from standings
  let teams: { name: string; seed: number }[] = [];

  if (seedTeams && seedTeams.length > 0) {
    teams = seedTeams.map((t: any, i: number) => ({
      name: t.name || t,
      seed: t.seed || i + 1,
    }));
  } else {
    // Pull from registrations
    const regs = await tenant.models.Registration.find({
      eventId: new Types.ObjectId(params.id),
      divisionId: new Types.ObjectId(divisionId),
      status: "approved",
    }).lean();

    teams = regs.map((r: any, i: number) => ({
      name: r.teamName,
      seed: i + 1,
    }));
  }

  if (teams.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams to create a bracket" },
      { status: 400 },
    );
  }

  // Generate bracket matches
  const matches = generateBracketMatches(teams, bracketType);

  const bracket = await tenant.models.Bracket.create({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
    name: `${(division as any).label} ${bracketType === "double_elimination" ? "Double Elimination" : bracketType === "consolation" ? "Consolation Bracket" : "Bracket"}`,
    type: bracketType,
    matches,
    status: "draft",
    createdBy: new Types.ObjectId(tenant.userId),
  });

  return NextResponse.json(bracket, { status: 201 });
}

interface SeedTeam {
  name: string;
  seed: number;
}

interface BracketMatch {
  matchNumber: number;
  round: number;
  homeTeamName?: string;
  awayTeamName?: string;
  status: "scheduled" | "in_progress" | "completed" | "canceled";
}

function generateBracketMatches(
  teams: SeedTeam[],
  bracketType: string,
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const teamCount = teams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(teamCount, 2))));
  const totalRounds = Math.log2(bracketSize);

  // Seed teams into bracket positions (1 vs last, 2 vs second-to-last, etc.)
  const seeded = seedBracket(teams, bracketSize);

  let matchNumber = 1;

  // Winners bracket
  let gamesInRound = bracketSize / 2;
  for (let round = 1; round <= totalRounds; round++) {
    for (let g = 0; g < gamesInRound; g++) {
      const match: BracketMatch = {
        matchNumber: matchNumber++,
        round,
        status: "scheduled",
      };

      if (round === 1) {
        const homeIdx = g * 2;
        const awayIdx = g * 2 + 1;
        match.homeTeamName = seeded[homeIdx] || undefined;
        match.awayTeamName = seeded[awayIdx] || undefined;

        // Handle byes
        if (match.homeTeamName && !match.awayTeamName) {
          match.awayTeamName = "BYE";
        }
        if (!match.homeTeamName && match.awayTeamName) {
          match.homeTeamName = "BYE";
        }
      }
      // Later rounds: team names filled in when previous round completes

      matches.push(match);
    }
    gamesInRound = Math.floor(gamesInRound / 2);
  }

  // Double elimination: add losers bracket rounds
  if (bracketType === "double_elimination") {
    // Losers bracket has (totalRounds - 1) * 2 rounds
    const losersRounds = (totalRounds - 1) * 2;
    let losersGames = bracketSize / 4; // first losers round

    for (let lr = 1; lr <= losersRounds; lr++) {
      const round = totalRounds + lr; // continue round numbering

      for (let g = 0; g < losersGames; g++) {
        matches.push({
          matchNumber: matchNumber++,
          round,
          status: "scheduled",
        });
      }

      // Losers bracket: alternates between same-count and halved rounds
      if (lr % 2 === 0) {
        losersGames = Math.max(1, Math.floor(losersGames / 2));
      }
    }

    // Grand final
    matches.push({
      matchNumber: matchNumber++,
      round: totalRounds + losersRounds + 1,
      status: "scheduled",
    });

    // Potential reset game (if losers bracket winner wins grand final)
    matches.push({
      matchNumber: matchNumber++,
      round: totalRounds + losersRounds + 2,
      homeTeamName: undefined,
      awayTeamName: undefined,
      status: "scheduled",
    });
  }

  // Consolation bracket: adds consolation games for round 1 losers + 3rd place game
  if (bracketType === "consolation") {
    const consolationRound = totalRounds + 1;

    // Pair up round 1 losers: loser of match 1 vs loser of match 2, etc.
    const firstRoundMatches = matches.filter((m) => m.round === 1);
    const consolationGamesCount = Math.floor(firstRoundMatches.length / 2);

    for (let g = 0; g < consolationGamesCount; g++) {
      matches.push({
        matchNumber: matchNumber++,
        round: consolationRound,
        status: "scheduled",
        // Team names filled in when round 1 losers are determined
      });
    }

    // If there are enough consolation games, add a consolation semifinal + final
    if (consolationGamesCount >= 2) {
      const consolSemiCount = Math.floor(consolationGamesCount / 2);
      for (let g = 0; g < consolSemiCount; g++) {
        matches.push({
          matchNumber: matchNumber++,
          round: consolationRound + 1,
          status: "scheduled",
        });
      }
    }

    // 3rd place game (loser of semifinal 1 vs loser of semifinal 2)
    if (totalRounds >= 2) {
      matches.push({
        matchNumber: matchNumber++,
        round: consolationRound + (consolationGamesCount >= 2 ? 2 : 1),
        status: "scheduled",
        // Team names: semifinal losers
      });
    }
  }

  return matches;
}

function seedBracket(teams: SeedTeam[], bracketSize: number): (string | undefined)[] {
  // Standard bracket seeding: 1 vs N, 2 vs N-1, etc.
  // Uses a proper bracket ordering to avoid top seeds meeting early
  const positions = getBracketOrder(bracketSize);
  const seeded: (string | undefined)[] = new Array(bracketSize).fill(undefined);

  for (let i = 0; i < teams.length; i++) {
    const pos = positions[i];
    if (pos !== undefined) {
      seeded[pos] = teams[i]!.name;
    }
  }

  return seeded;
}

// Generate proper bracket seeding order so top seeds are spread across the bracket
function getBracketOrder(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];

  const order: number[] = [0, 1];
  let currentSize = 2;

  while (currentSize < size) {
    const next: number[] = [];
    for (const pos of order) {
      next.push(pos);
      next.push(currentSize * 2 - 1 - pos);
    }
    order.length = 0;
    order.push(...next);
    currentSize *= 2;
  }

  return order;
}
