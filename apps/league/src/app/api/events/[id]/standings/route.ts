export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/standings — list standings for an event (admin, auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { Standing, Division, Event } = tenant.models;

  const event = await Event.findById(id).select("name divisionIds").lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const divisions = await Division.find({
    _id: { $in: (event as any).divisionIds },
  })
    .select("key label")
    .lean();

  const standings = await Standing.find({ eventId: id })
    .sort({ divisionId: 1, rank: 1, wins: -1, pointDifferential: -1 })
    .lean();

  return NextResponse.json({ event, divisions, standings });
}

// POST /api/events/[id]/standings/recalculate — recalculate standings from game results
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { Standing, Game, Division, Event } = tenant.models;

  const event = await Event.findById(id)
    .select("divisionIds tiebreakerRules")
    .lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const tiebreakerRules = ((event as any).tiebreakerRules || [])
    .sort((a: any, b: any) => a.priority - b.priority)
    .map((r: any) => r.rule as string);

  // Get all completed games for this event
  const games = await Game.find({
    eventId: id,
    status: { $in: ["completed", "forfeit"] },
  }).lean();

  // Build standings map: divisionId -> teamKey -> stats
  // Also build head-to-head records: "teamA|teamB" -> { aWins, bWins, aDiff, bDiff }
  const standingsMap = new Map<string, Map<string, any>>();
  const h2hMap = new Map<string, Map<string, Record<string, { wins: number; losses: number; pf: number; pa: number }>>>();
  // Track forfeits per team per division
  const forfeitMap = new Map<string, Map<string, number>>();
  // Track opponents per team per division for strength of schedule
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
        teamId: game.homeTeamId,
        teamName: game.homeTeamName,
        wins: 0, losses: 0, ties: 0,
        pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0,
      });
    }
    if (!divMap.has(awayKey)) {
      divMap.set(awayKey, {
        teamId: game.awayTeamId,
        teamName: game.awayTeamName,
        wins: 0, losses: 0, ties: 0,
        pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0,
      });
    }

    const home = divMap.get(homeKey)!;
    const away = divMap.get(awayKey)!;

    const hs = game.homeScore ?? 0;
    const as_ = game.awayScore ?? 0;

    home.gamesPlayed++;
    away.gamesPlayed++;
    home.pointsFor += hs;
    home.pointsAgainst += as_;
    away.pointsFor += as_;
    away.pointsAgainst += hs;

    if (hs > as_) {
      home.wins++;
      away.losses++;
    } else if (as_ > hs) {
      away.wins++;
      home.losses++;
    } else {
      home.ties++;
      away.ties++;
    }

    // Track forfeits
    if (game.status === "forfeit") {
      // Losing team forfeited
      if (hs > as_) {
        divForfeit.set(awayKey, (divForfeit.get(awayKey) || 0) + 1);
      } else if (as_ > hs) {
        divForfeit.set(homeKey, (divForfeit.get(homeKey) || 0) + 1);
      }
    }

    // Track opponents for strength of schedule
    if (!divOpponents.has(homeKey)) divOpponents.set(homeKey, []);
    if (!divOpponents.has(awayKey)) divOpponents.set(awayKey, []);
    divOpponents.get(homeKey)!.push(awayKey);
    divOpponents.get(awayKey)!.push(homeKey);

    // Build head-to-head records
    if (!divH2H.has(homeKey)) divH2H.set(homeKey, {});
    if (!divH2H.has(awayKey)) divH2H.set(awayKey, {});
    const homeH2H = divH2H.get(homeKey)! as any;
    const awayH2H = divH2H.get(awayKey)! as any;

    if (!homeH2H[awayKey]) homeH2H[awayKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };
    if (!awayH2H[homeKey]) awayH2H[homeKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };

    homeH2H[awayKey].pf += hs;
    homeH2H[awayKey].pa += as_;
    awayH2H[homeKey].pf += as_;
    awayH2H[homeKey].pa += hs;

    if (hs > as_) {
      homeH2H[awayKey].wins++;
      awayH2H[homeKey].losses++;
    } else if (as_ > hs) {
      awayH2H[homeKey].wins++;
      homeH2H[awayKey].losses++;
    }
  }

  // ─── Tiebreaker sorting ───

  /**
   * Build a comparator from the event's tiebreaker rules.
   * Each rule maps to a numeric comparator returning negative (a ranks higher),
   * positive (b ranks higher), or 0 (tied on this criterion).
   */
  function buildComparator(
    divMap: Map<string, any>,
    divH2H: Map<string, any>,
    divForfeit: Map<string, number>,
    divOpponents: Map<string, string[]>,
  ) {
    // Pre-compute win percentages for strength of schedule
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
        const aVsB = (divH2H.get(aKey) as any)?.[bKey];
        if (!aVsB) return 0;
        return (aVsB.losses - aVsB.wins); // more wins over b => a ranks higher (negative)
      },
      "Point differential": (a, b) => {
        return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      },
      "Points allowed": (a, b) => {
        return a.pointsAgainst - b.pointsAgainst; // fewer PA = ranks higher
      },
      "Points scored": (a, b) => {
        return b.pointsFor - a.pointsFor;
      },
      "Head-to-head point differential": (a, b) => {
        const aKey = a.teamId?.toString() || a.teamName;
        const bKey = b.teamId?.toString() || b.teamName;
        const aVsB = (divH2H.get(aKey) as any)?.[bKey];
        if (!aVsB) return 0;
        const bVsA = (divH2H.get(bKey) as any)?.[aKey];
        if (!bVsA) return 0;
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
      // Always sort by wins first as the primary criterion
      if (b.wins !== a.wins) return b.wins - a.wins;

      // Apply tiebreaker rules in priority order
      for (const rule of tiebreakerRules) {
        const cmp = comparators[rule];
        if (cmp) {
          const result = cmp(a, b);
          if (result !== 0) return result;
        }
      }

      // Fallback if no tiebreaker rules or all tied: point differential, then points scored
      const diff = (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      if (diff !== 0) return diff;
      return b.pointsFor - a.pointsFor;
    };
  }

  // Write standings to DB (upsert per team per division)
  const ops: any[] = [];

  for (const [divisionId, divMap] of standingsMap) {
    const divH2H = h2hMap.get(divisionId) || new Map();
    const divForfeit = forfeitMap.get(divisionId) || new Map();
    const divOpponents = opponentsMap.get(divisionId) || new Map();

    const comparator = buildComparator(divMap, divH2H, divForfeit, divOpponents);
    const sorted = [...divMap.values()].sort(comparator);

    sorted.forEach((team, idx) => {
      const pointDifferential = team.pointsFor - team.pointsAgainst;
      ops.push({
        updateOne: {
          filter: {
            eventId: id,
            divisionId,
            teamName: team.teamName,
          },
          update: {
            $set: {
              teamId: team.teamId,
              teamName: team.teamName,
              wins: team.wins,
              losses: team.losses,
              ties: team.ties,
              pointsFor: team.pointsFor,
              pointsAgainst: team.pointsAgainst,
              pointDifferential,
              gamesPlayed: team.gamesPlayed,
              rank: idx + 1,
            },
          },
          upsert: true,
        },
      });
    });
  }

  // Clear old standings and write fresh ones
  await Standing.deleteMany({ eventId: id });
  if (ops.length > 0) {
    await Standing.bulkWrite(ops);
  }

  const standings = await Standing.find({ eventId: id })
    .sort({ divisionId: 1, rank: 1 })
    .lean();

  return NextResponse.json({
    recalculated: true,
    count: standings.length,
    standings,
    tiebreakerRulesApplied: tiebreakerRules,
  });
}
