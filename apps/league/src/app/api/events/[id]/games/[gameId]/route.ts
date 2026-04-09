export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// PATCH /api/events/[id]/games/[gameId] — update a game (scores, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; gameId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id) || !Types.ObjectId.isValid(params.gameId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.homeScore !== undefined) update.homeScore = body.homeScore;
  if (body.awayScore !== undefined) update.awayScore = body.awayScore;
  if (body.status) update.status = body.status;
  if (body.homeTeamName) update.homeTeamName = body.homeTeamName;
  if (body.awayTeamName) update.awayTeamName = body.awayTeamName;
  if (body.homeTeamId) update.homeTeamId = new Types.ObjectId(body.homeTeamId);
  if (body.awayTeamId) update.awayTeamId = new Types.ObjectId(body.awayTeamId);
  if (body.field) update.field = body.field;
  if (body.timeSlot) update.timeSlot = body.timeSlot;
  if (body.scheduledAt) update.scheduledAt = new Date(body.scheduledAt);
  if (body.locationName) update.locationName = body.locationName;
  if (body.dayIndex !== undefined) update.dayIndex = body.dayIndex;

  // Auto-determine winner when completing
  if (body.status === "completed" && body.homeScore !== undefined && body.awayScore !== undefined) {
    update.completedAt = new Date();
    update.scoredBy = new Types.ObjectId(tenant.userId);
    if (body.homeScore > body.awayScore && body.homeTeamId) {
      update.winnerId = new Types.ObjectId(body.homeTeamId);
    } else if (body.awayScore > body.homeScore && body.awayTeamId) {
      update.winnerId = new Types.ObjectId(body.awayTeamId);
    }
  }

  const game = await tenant.models.Game.findOneAndUpdate(
    { _id: new Types.ObjectId(params.gameId), eventId: new Types.ObjectId(params.id) },
    { $set: update },
    { new: true },
  ).lean();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Sync back to bracket if this is a bracket game
  const gameObj = game as any;
  if (gameObj.bracketId && body.status === "completed" &&
      gameObj.homeScore !== undefined && gameObj.awayScore !== undefined) {
    try {
      await syncGameToBracket(tenant.models, gameObj);
    } catch (err) {
      console.error("[game PATCH] bracket sync failed:", err);
    }
  }

  // Auto-recalculate standings when a game is completed or score changes
  if (body.status === "completed" || body.status === "forfeit" ||
      (body.homeScore !== undefined || body.awayScore !== undefined)) {
    try {
      await recalculateStandings(tenant.models, params.id);
    } catch (err) {
      console.error("[game PATCH] standings recalc failed:", err);
    }
  }

  // Flag champion + finalist when a championship game completes
  const gameObj = game as any;
  if (body.status === "completed" && gameObj.homeScore !== undefined && gameObj.awayScore !== undefined) {
    const roundLower = (gameObj.round || "").toLowerCase();
    const isChampionship =
      roundLower === "championship" ||
      roundLower === "final" ||
      roundLower === "gold medal" ||
      roundLower === "title game" ||
      roundLower.startsWith("championship");
    if (isChampionship) {
      try {
        const winnerName =
          gameObj.homeScore > gameObj.awayScore
            ? gameObj.homeTeamName
            : gameObj.awayScore > gameObj.homeScore
            ? gameObj.awayTeamName
            : null;
        const loserName =
          gameObj.homeScore > gameObj.awayScore
            ? gameObj.awayTeamName
            : gameObj.awayScore > gameObj.homeScore
            ? gameObj.homeTeamName
            : null;

        // Get division label and detect bracket tier from bracket name
        const division = await tenant.models.Division.findById(gameObj.divisionId)
          .select("label")
          .lean();
        const divLabel = (division as any)?.label || "";

        // Detect bracket tier (Gold, Silver, Bronze) from bracket name
        let bracketTier = "";
        if (gameObj.bracketId) {
          const bracket = await tenant.models.Bracket.findById(gameObj.bracketId)
            .select("name")
            .lean();
          const bracketName = ((bracket as any)?.name || "").toLowerCase();
          if (bracketName.includes("gold")) bracketTier = "Gold";
          else if (bracketName.includes("silver")) bracketTier = "Silver";
          else if (bracketName.includes("bronze")) bracketTier = "Bronze";
        }

        const regFilter = {
          eventId: new Types.ObjectId(params.id),
          status: { $in: ["approved", "pending"] },
        };

        // Mark champion
        if (winnerName) {
          await tenant.models.Registration.updateOne(
            { ...regFilter, teamName: winnerName },
            { $set: { champion: true, championDivision: divLabel, bracketTier: bracketTier || undefined } },
          );
        }

        // Mark finalist (runner-up)
        if (loserName) {
          await tenant.models.Registration.updateOne(
            { ...regFilter, teamName: loserName },
            { $set: { finalist: true, championDivision: divLabel, bracketTier: bracketTier || undefined } },
          );
        }
      } catch (err) {
        console.error("[game PATCH] champion/finalist flag failed:", err);
      }
    }
  }

  return NextResponse.json(game);
}

// ─── Standings recalculation with configurable tiebreaker rules ───

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

  // Build per-division stats, head-to-head, forfeit, and opponent maps
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

    // Track forfeits
    if (game.status === "forfeit") {
      if (hs > as_) divForfeit.set(awayKey, (divForfeit.get(awayKey) || 0) + 1);
      else if (as_ > hs) divForfeit.set(homeKey, (divForfeit.get(homeKey) || 0) + 1);
    }

    // Track opponents for strength of schedule
    if (!divOpponents.has(homeKey)) divOpponents.set(homeKey, []);
    if (!divOpponents.has(awayKey)) divOpponents.set(awayKey, []);
    divOpponents.get(homeKey)!.push(awayKey);
    divOpponents.get(awayKey)!.push(homeKey);

    // Build head-to-head records
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

  // Build tiebreaker comparator from event rules
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
      "Point differential": (a, b) => {
        return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      },
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
      // Fallback: point differential, then points scored
      const diff = (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
      if (diff !== 0) return diff;
      return b.pointsFor - a.pointsFor;
    };
  }

  // Write standings to DB
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

  // Clear old standings and write fresh ones
  await Standing.deleteMany({ eventId });
  if (ops.length > 0) await Standing.bulkWrite(ops);
}

// ─── Sync game score back to bracket and advance winner ───

async function syncGameToBracket(models: any, game: any) {
  const bracket = await models.Bracket.findById(game.bracketId);
  if (!bracket) return;

  const match = bracket.matches.find(
    (m: any) => m.matchNumber === game.gameNumber,
  );
  if (!match) return;

  // Update match scores and status
  match.homeScore = game.homeScore;
  match.awayScore = game.awayScore;
  match.status = "completed";

  const winnerName =
    game.homeScore > game.awayScore
      ? match.homeTeamName
      : game.awayScore > game.homeScore
      ? match.awayTeamName
      : null;

  if (winnerName) {
    match.winnerName = winnerName;

    // Advance winner to next match via pointer
    if (match.nextMatchNumber) {
      const nextMatch = bracket.matches.find(
        (m: any) => m.matchNumber === match.nextMatchNumber,
      );
      if (nextMatch) {
        if (match.nextSlot === "home") {
          nextMatch.homeTeamName = winnerName;
        } else {
          nextMatch.awayTeamName = winnerName;
        }

        // Also update the next match's Game record in the schedule
        await models.Game.updateOne(
          {
            bracketId: bracket._id,
            gameNumber: match.nextMatchNumber,
          },
          {
            $set: {
              ...(match.nextSlot === "home"
                ? { homeTeamName: winnerName }
                : { awayTeamName: winnerName }),
            },
          },
        );
      }
    }
  }

  // Check if bracket is complete
  const allDone = bracket.matches
    .filter(
      (m: any) =>
        m.homeTeamName &&
        m.awayTeamName &&
        m.homeTeamName !== "BYE" &&
        m.awayTeamName !== "BYE" &&
        m.homeTeamName !== "TBD" &&
        m.awayTeamName !== "TBD",
    )
    .every((m: any) => m.status === "completed");

  if (allDone) {
    bracket.status = "completed";
  } else if (bracket.status === "draft") {
    bracket.status = "in_progress";
  }

  bracket.markModified("matches");
  await bracket.save();
}
