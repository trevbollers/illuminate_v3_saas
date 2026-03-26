export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/brackets/[bracketId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; bracketId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bracket = await tenant.models.Bracket.findById(params.bracketId).lean();
  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }

  return NextResponse.json(bracket);
}

// PATCH /api/events/[id]/brackets/[bracketId] — update bracket (status, report match result)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; bracketId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.bracketId)) {
    return NextResponse.json({ error: "Invalid bracket ID" }, { status: 400 });
  }

  const body = await req.json();

  // Handle match result reporting with automatic advancement
  if (body.matchResult) {
    const { matchNumber, homeScore, awayScore } = body.matchResult;

    const bracket = await tenant.models.Bracket.findById(params.bracketId);
    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const matchIdx = bracket.matches.findIndex((m: any) => m.matchNumber === matchNumber);
    if (matchIdx === -1) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const match = bracket.matches[matchIdx]!;
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = "completed";

    // Determine winner
    const winnerName = homeScore > awayScore ? match.homeTeamName : match.awayTeamName;
    const loserName = homeScore > awayScore ? match.awayTeamName : match.homeTeamName;

    // Advance winner to next round
    if (winnerName) {
      advanceWinner(bracket.matches, match, winnerName, bracket.type);
    }

    // For double elimination, send loser to losers bracket
    if (bracket.type === "double_elimination" && loserName) {
      advanceLoser(bracket.matches, match, loserName);
    }

    // For consolation, send round 1 losers and semifinal losers to consolation games
    if (bracket.type === "consolation" && loserName) {
      advanceConsolationLoser(bracket.matches, match, loserName);
    }

    // Check if bracket is complete
    const allMatchesComplete = bracket.matches
      .filter((m: any) => m.homeTeamName && m.awayTeamName && m.homeTeamName !== "BYE" && m.awayTeamName !== "BYE")
      .every((m: any) => m.status === "completed");

    if (allMatchesComplete) {
      bracket.status = "completed";
    } else if (bracket.status === "draft") {
      bracket.status = "in_progress";
    }

    await bracket.save();

    return NextResponse.json(bracket.toObject());
  }

  // Generic status update
  if (body.status) {
    const bracket = await tenant.models.Bracket.findByIdAndUpdate(
      params.bracketId,
      { $set: { status: body.status } },
      { new: true },
    ).lean();
    return NextResponse.json(bracket);
  }

  return NextResponse.json({ error: "No update provided" }, { status: 400 });
}

// DELETE /api/events/[id]/brackets/[bracketId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; bracketId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await tenant.models.Bracket.findByIdAndDelete(params.bracketId);
  return NextResponse.json({ ok: true });
}

function advanceWinner(matches: any[], completedMatch: any, winnerName: string, bracketType: string) {
  const round = completedMatch.round;
  const matchNumber = completedMatch.matchNumber;

  // Find total winners bracket rounds
  const winnersMatches = matches.filter((m: any) => {
    if (bracketType === "double_elimination") {
      // Winners bracket matches are in the first N rounds
      const winnersRounds = getWinnersRoundCount(matches);
      return m.round <= winnersRounds;
    }
    return true;
  });

  // Find which game in the current round this is (0-indexed)
  const roundMatches = winnersMatches.filter((m: any) => m.round === round);
  const gameIndex = roundMatches.findIndex((m: any) => m.matchNumber === matchNumber);

  // The next round's game index is floor(gameIndex / 2)
  const nextRound = round + 1;
  const nextGameInRound = Math.floor(gameIndex / 2);
  const nextRoundMatches = winnersMatches.filter((m: any) => m.round === nextRound);

  if (nextRoundMatches.length > nextGameInRound) {
    const nextMatch = nextRoundMatches[nextGameInRound]!;
    // Even game index → home, odd → away
    if (gameIndex % 2 === 0) {
      nextMatch.homeTeamName = winnerName;
    } else {
      nextMatch.awayTeamName = winnerName;
    }
  }

  // Auto-complete BYE matches
  for (const m of matches) {
    if (m.status !== "scheduled") continue;
    if (m.homeTeamName === "BYE" && m.awayTeamName && m.awayTeamName !== "BYE") {
      m.homeScore = 0;
      m.awayScore = 0;
      m.status = "completed";
      advanceWinner(matches, m, m.awayTeamName, bracketType);
    } else if (m.awayTeamName === "BYE" && m.homeTeamName && m.homeTeamName !== "BYE") {
      m.homeScore = 0;
      m.awayScore = 0;
      m.status = "completed";
      advanceWinner(matches, m, m.homeTeamName, bracketType);
    }
  }
}

function advanceLoser(matches: any[], completedMatch: any, loserName: string) {
  const round = completedMatch.round;
  const roundMatches = matches.filter((m: any) => m.round === round);
  const gameIndex = roundMatches.findIndex((m: any) => m.matchNumber === completedMatch.matchNumber);

  // Find the losers bracket start round (winners rounds + 1)
  const winnersRounds = getWinnersRoundCount(matches);
  const losersStartRound = winnersRounds + 1;

  // Map winners round losses to losers bracket slots
  // Round 1 losers go to losers round 1, Round 2 losers to losers round 3, etc.
  const losersRound = losersStartRound + (round - 1) * 2;
  const losersRoundMatches = matches.filter((m: any) => m.round === losersRound);

  if (losersRoundMatches.length > 0) {
    // Find first available slot
    const targetIdx = Math.floor(gameIndex / (losersRoundMatches.length > 1 ? 2 : 1));
    const target = losersRoundMatches[Math.min(targetIdx, losersRoundMatches.length - 1)];
    if (target) {
      if (!target.homeTeamName) {
        target.homeTeamName = loserName;
      } else if (!target.awayTeamName) {
        target.awayTeamName = loserName;
      }
    }
  }
}

function getWinnersRoundCount(matches: any[]): number {
  const rounds = [...new Set(matches.map((m: any) => m.round as number))].sort((a, b) => a - b);
  const firstRoundCount = matches.filter((m: any) => m.round === rounds[0]).length;
  return Math.ceil(Math.log2(firstRoundCount * 2));
}

function advanceConsolationLoser(matches: any[], completedMatch: any, loserName: string) {
  const round = completedMatch.round;
  const winnersRounds = getWinnersRoundCount(matches);
  const consolationStartRound = winnersRounds + 1;

  // Round 1 losers go to consolation round 1
  if (round === 1) {
    const roundMatches = matches.filter((m: any) => m.round === round);
    const gameIndex = roundMatches.findIndex((m: any) => m.matchNumber === completedMatch.matchNumber);
    const consolationMatches = matches.filter((m: any) => m.round === consolationStartRound);
    const targetIdx = Math.floor(gameIndex / 2);
    const target = consolationMatches[Math.min(targetIdx, consolationMatches.length - 1)];
    if (target) {
      if (!target.homeTeamName) {
        target.homeTeamName = loserName;
      } else if (!target.awayTeamName) {
        target.awayTeamName = loserName;
      }
    }
  }

  // Semifinal losers go to 3rd place game
  if (round === winnersRounds - 1) {
    // Find the last consolation round (3rd place game)
    const allRounds = [...new Set(matches.map((m: any) => m.round as number))].sort((a, b) => a - b);
    const lastRound = allRounds[allRounds.length - 1]!;
    const thirdPlaceMatches = matches.filter((m: any) => m.round === lastRound);
    const target = thirdPlaceMatches[0];
    if (target) {
      if (!target.homeTeamName) {
        target.homeTeamName = loserName;
      } else if (!target.awayTeamName) {
        target.awayTeamName = loserName;
      }
    }
  }
}
