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

  // Handle match result reporting with pointer-based advancement
  if (body.matchResult) {
    const { matchNumber, homeScore, awayScore } = body.matchResult;

    const bracket = await tenant.models.Bracket.findById(params.bracketId);
    if (!bracket) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const match = bracket.matches.find((m: any) => m.matchNumber === matchNumber);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = "completed";

    const winnerName = homeScore > awayScore ? match.homeTeamName : match.awayTeamName;
    const loserName = homeScore > awayScore ? match.awayTeamName : match.homeTeamName;

    if (winnerName) {
      match.winnerId = undefined;
      match.winnerName = winnerName;
    }

    // Advance winner via pre-computed pointer — zero computation
    if (winnerName && match.nextMatchNumber) {
      const nextMatch = bracket.matches.find(
        (m: any) => m.matchNumber === match.nextMatchNumber,
      );
      if (nextMatch) {
        if (match.nextSlot === "home") {
          nextMatch.homeTeamName = winnerName;
        } else {
          nextMatch.awayTeamName = winnerName;
        }
      }
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

    // ── Sync completed match to Games collection ──
    try {
      await syncBracketMatchToGame(
        tenant.models,
        params.id,
        (bracket as any).divisionId.toString(),
        (bracket as any)._id.toString(),
        match,
        tenant.userId,
      );
    } catch (err) {
      console.error("[bracket PATCH] game sync failed:", err);
    }

    // ── Recalculate standings with configurable tiebreaker rules ──
    try {
      await recalculateStandings(tenant.models, params.id);
    } catch (err) {
      console.error("[bracket PATCH] standings recalc failed:", err);
    }

    // ── Update next matches in Games collection ──
    try {
      await syncBracketAdvancementsToGames(
        tenant.models,
        params.id,
        (bracket as any).divisionId.toString(),
        (bracket as any)._id.toString(),
        bracket.matches as any[],
      );
    } catch (err) {
      console.error("[bracket PATCH] advancement sync failed:", err);
    }

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

  // Delete bracket and associated games
  await tenant.models.Game.deleteMany({
    bracketId: new Types.ObjectId(params.bracketId),
  });
  await tenant.models.Bracket.findByIdAndDelete(params.bracketId);
  return NextResponse.json({ ok: true });
}

// ════════════════════════════════════════════════════
// Sync bracket match → Game record
// ════════════════════════════════════════════════════

async function syncBracketMatchToGame(
  models: any,
  eventId: string,
  divisionId: string,
  bracketId: string,
  match: any,
  userId: string,
) {
  const filter = {
    eventId: new Types.ObjectId(eventId),
    bracketId: new Types.ObjectId(bracketId),
    gameNumber: match.matchNumber,
  };

  const gameData: any = {
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(divisionId),
    bracketId: new Types.ObjectId(bracketId),
    homeTeamName: match.homeTeamName || "TBD",
    awayTeamName: match.awayTeamName || "TBD",
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    round: match.roundLabel || `Round ${match.round}`,
    gameNumber: match.matchNumber,
    field: match.field || "",
    locationName: match.field || "TBD",
    timeSlot: "",
    dayIndex: 0,
    scheduledAt: match.scheduledAt || new Date(),
    sport: "",
  };

  if (match.status === "completed") {
    gameData.completedAt = new Date();
    gameData.scoredBy = new Types.ObjectId(userId);
    if (match.homeScore > match.awayScore && match.homeTeamId) {
      gameData.winnerId = match.homeTeamId;
    } else if (match.awayScore > match.homeScore && match.awayTeamId) {
      gameData.winnerId = match.awayTeamId;
    }
  }

  await models.Game.findOneAndUpdate(
    filter,
    { $set: gameData },
    { upsert: true, new: true },
  );
}

// Sync advanced team names to upcoming Games so schedule shows correct matchups
async function syncBracketAdvancementsToGames(
  models: any,
  eventId: string,
  divisionId: string,
  bracketId: string,
  matches: any[],
) {
  for (const match of matches) {
    if (match.status === "completed") continue; // Already synced
    if (!match.homeTeamName && !match.awayTeamName) continue; // Nothing to sync

    await models.Game.findOneAndUpdate(
      {
        eventId: new Types.ObjectId(eventId),
        bracketId: new Types.ObjectId(bracketId),
        gameNumber: match.matchNumber,
      },
      {
        $set: {
          homeTeamName: match.homeTeamName || "TBD",
          awayTeamName: match.awayTeamName || "TBD",
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          round: match.roundLabel || `Round ${match.round}`,
        },
      },
      { upsert: false }, // Only update existing — don't create games for unscheduled matches
    );
  }
}

// ════════════════════════════════════════════════════
// Standings recalculation with configurable tiebreaker rules
// ════════════════════════════════════════════════════

async function recalculateStandings(models: any, eventId: string) {
  const { Standing, Game, Event } = models;

  const event = await Event.findById(eventId)
    .select("divisionIds tiebreakerRules")
    .lean();
  if (!event) return;

  const tiebreakerRules = ((event as any).tiebreakerRules || [])
    .sort((a: any, b: any) => a.priority - b.priority)
    .map((r: any) => r.rule as string);

  const games = await Game.find({
    eventId,
    status: { $in: ["completed", "forfeit"] },
  }).lean();

  const standingsMap = new Map<string, Map<string, any>>();
  const h2hMap = new Map<string, Map<string, any>>();
  const forfeitMap = new Map<string, Map<string, number>>();
  const opponentsMap = new Map<string, Map<string, string[]>>();

  for (const game of games as any[]) {
    const divKey = game.divisionId.toString();
    if (!standingsMap.has(divKey)) standingsMap.set(divKey, new Map());
    if (!h2hMap.has(divKey)) h2hMap.set(divKey, new Map());
    if (!forfeitMap.has(divKey)) forfeitMap.set(divKey, new Map());
    if (!opponentsMap.has(divKey)) opponentsMap.set(divKey, new Map());

    const divMap = standingsMap.get(divKey)!;
    const divH2H = h2hMap.get(divKey)!;
    const divForfeit = forfeitMap.get(divKey)!;
    const divOpponents = opponentsMap.get(divKey)!;

    const homeKey = game.homeTeamId?.toString() || game.homeTeamName;
    const awayKey = game.awayTeamId?.toString() || game.awayTeamName;

    if (!divMap.has(homeKey)) {
      divMap.set(homeKey, {
        teamId: game.homeTeamId, teamName: game.homeTeamName,
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0,
      });
    }
    if (!divMap.has(awayKey)) {
      divMap.set(awayKey, {
        teamId: game.awayTeamId, teamName: game.awayTeamName,
        wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0,
      });
    }

    const home = divMap.get(homeKey)!;
    const away = divMap.get(awayKey)!;
    const hs = game.homeScore ?? 0;
    const as_ = game.awayScore ?? 0;

    home.gamesPlayed++; away.gamesPlayed++;
    home.pointsFor += hs; home.pointsAgainst += as_;
    away.pointsFor += as_; away.pointsAgainst += hs;

    if (hs > as_) { home.wins++; away.losses++; }
    else if (as_ > hs) { away.wins++; home.losses++; }
    else { home.ties++; away.ties++; }

    if (game.status === "forfeit") {
      if (hs > as_) divForfeit.set(awayKey, (divForfeit.get(awayKey) || 0) + 1);
      else if (as_ > hs) divForfeit.set(homeKey, (divForfeit.get(homeKey) || 0) + 1);
    }

    if (!divOpponents.has(homeKey)) divOpponents.set(homeKey, []);
    if (!divOpponents.has(awayKey)) divOpponents.set(awayKey, []);
    divOpponents.get(homeKey)!.push(awayKey);
    divOpponents.get(awayKey)!.push(homeKey);

    if (!divH2H.has(homeKey)) divH2H.set(homeKey, {});
    if (!divH2H.has(awayKey)) divH2H.set(awayKey, {});
    const homeH2H = divH2H.get(homeKey)!;
    const awayH2H = divH2H.get(awayKey)!;
    if (!homeH2H[awayKey]) homeH2H[awayKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };
    if (!awayH2H[homeKey]) awayH2H[homeKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };
    homeH2H[awayKey].pf += hs; homeH2H[awayKey].pa += as_;
    awayH2H[homeKey].pf += as_; awayH2H[homeKey].pa += hs;
    if (hs > as_) { homeH2H[awayKey].wins++; awayH2H[homeKey].losses++; }
    else if (as_ > hs) { awayH2H[homeKey].wins++; homeH2H[awayKey].losses++; }
  }

  function buildComparator(
    divMap: Map<string, any>,
    divH2H: Map<string, any>,
    divForfeit: Map<string, number>,
    divOpponents: Map<string, string[]>,
  ) {
    const winPct = (key: string) => {
      const t = divMap.get(key);
      if (!t || t.gamesPlayed === 0) return 0;
      return (t.wins + t.ties * 0.5) / t.gamesPlayed;
    };

    const comparators: Record<string, (a: any, b: any) => number> = {
      "Win percentage": (a, b) => {
        const aPct = a.gamesPlayed > 0 ? (a.wins + a.ties * 0.5) / a.gamesPlayed : 0;
        const bPct = b.gamesPlayed > 0 ? (b.wins + b.ties * 0.5) / b.gamesPlayed : 0;
        return bPct - aPct;
      },
      "Head-to-head record": (a, b) => {
        const aKey = a.teamId?.toString() || a.teamName;
        const bKey = b.teamId?.toString() || b.teamName;
        const aVsB = divH2H.get(aKey)?.[bKey];
        if (!aVsB) return 0;
        return aVsB.losses - aVsB.wins;
      },
      "Point differential": (a, b) =>
        (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst),
      "Points allowed": (a, b) => a.pointsAgainst - b.pointsAgainst,
      "Points scored": (a, b) => b.pointsFor - a.pointsFor,
      "Head-to-head point differential": (a, b) => {
        const aKey = a.teamId?.toString() || a.teamName;
        const bKey = b.teamId?.toString() || b.teamName;
        const aVsB = divH2H.get(aKey)?.[bKey];
        const bVsA = divH2H.get(bKey)?.[aKey];
        if (!aVsB || !bVsA) return 0;
        return (aVsB.pa - aVsB.pf) - (bVsA.pa - bVsA.pf);
      },
      "Strength of schedule": (a, b) => {
        const aKey = a.teamId?.toString() || a.teamName;
        const bKey = b.teamId?.toString() || b.teamName;
        const aOpps = divOpponents.get(aKey) || [];
        const bOpps = divOpponents.get(bKey) || [];
        const aSOS = aOpps.length > 0 ? aOpps.reduce((s, o) => s + winPct(o), 0) / aOpps.length : 0;
        const bSOS = bOpps.length > 0 ? bOpps.reduce((s, o) => s + winPct(o), 0) / bOpps.length : 0;
        return bSOS - aSOS;
      },
      "Fewest forfeits": (a, b) => {
        const aKey = a.teamId?.toString() || a.teamName;
        const bKey = b.teamId?.toString() || b.teamName;
        return (divForfeit.get(aKey) || 0) - (divForfeit.get(bKey) || 0);
      },
    };

    return (a: any, b: any): number => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      for (const rule of tiebreakerRules) {
        const cmp = comparators[rule];
        if (cmp) {
          const result = cmp(a, b);
          if (result !== 0) return result;
        }
      }
      const diff = (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      if (diff !== 0) return diff;
      return b.pointsFor - a.pointsFor;
    };
  }

  const ops: any[] = [];
  for (const [divisionId, divMap] of standingsMap) {
    const divH2H = h2hMap.get(divisionId) || new Map();
    const divForfeit = forfeitMap.get(divisionId) || new Map();
    const divOpponents = opponentsMap.get(divisionId) || new Map();
    const comparator = buildComparator(divMap, divH2H, divForfeit, divOpponents);
    const sorted = [...divMap.values()].sort(comparator);

    sorted.forEach((team, idx) => {
      ops.push({
        updateOne: {
          filter: { eventId, divisionId, teamName: team.teamName },
          update: {
            $set: {
              teamId: team.teamId, teamName: team.teamName,
              wins: team.wins, losses: team.losses, ties: team.ties,
              pointsFor: team.pointsFor, pointsAgainst: team.pointsAgainst,
              pointDifferential: team.pointsFor - team.pointsAgainst,
              gamesPlayed: team.gamesPlayed, rank: idx + 1,
            },
          },
          upsert: true,
        },
      });
    });
  }

  await Standing.deleteMany({ eventId });
  if (ops.length > 0) await Standing.bulkWrite(ops);
}

// ════════════════════════════════════════════════════
// Loser advancement helpers
// ════════════════════════════════════════════════════

function advanceLoser(matches: any[], completedMatch: any, loserName: string) {
  const round = completedMatch.round;
  const roundMatches = matches.filter((m: any) => m.round === round);
  const gameIndex = roundMatches.findIndex((m: any) => m.matchNumber === completedMatch.matchNumber);

  const winnersRounds = getWinnersRoundCount(matches);
  const losersStartRound = winnersRounds + 1;
  const losersRound = losersStartRound + (round - 1) * 2;
  const losersRoundMatches = matches.filter((m: any) => m.round === losersRound);

  if (losersRoundMatches.length > 0) {
    const targetIdx = Math.floor(gameIndex / (losersRoundMatches.length > 1 ? 2 : 1));
    const target = losersRoundMatches[Math.min(targetIdx, losersRoundMatches.length - 1)];
    if (target) {
      if (!target.homeTeamName) target.homeTeamName = loserName;
      else if (!target.awayTeamName) target.awayTeamName = loserName;
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

  if (round === 1) {
    const roundMatches = matches.filter((m: any) => m.round === round);
    const gameIndex = roundMatches.findIndex((m: any) => m.matchNumber === completedMatch.matchNumber);
    const consolationMatches = matches.filter((m: any) => m.round === consolationStartRound);
    const targetIdx = Math.floor(gameIndex / 2);
    const target = consolationMatches[Math.min(targetIdx, consolationMatches.length - 1)];
    if (target) {
      if (!target.homeTeamName) target.homeTeamName = loserName;
      else if (!target.awayTeamName) target.awayTeamName = loserName;
    }
  }

  if (round === winnersRounds - 1) {
    const allRounds = [...new Set(matches.map((m: any) => m.round as number))].sort((a, b) => a - b);
    const lastRound = allRounds[allRounds.length - 1]!;
    const thirdPlaceMatches = matches.filter((m: any) => m.round === lastRound);
    const target = thirdPlaceMatches[0];
    if (target) {
      if (!target.homeTeamName) target.homeTeamName = loserName;
      else if (!target.awayTeamName) target.awayTeamName = loserName;
    }
  }
}
