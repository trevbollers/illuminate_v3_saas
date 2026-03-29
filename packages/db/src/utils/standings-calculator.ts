/**
 * Pure standings calculation functions — no DB dependencies.
 * Used by the standings API route and unit tests.
 */

export interface GameResult {
  divisionId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: "completed" | "forfeit";
}

export interface TeamStanding {
  teamId?: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
  rank?: number;
}

export interface H2HRecord {
  wins: number;
  losses: number;
  pf: number;
  pa: number;
}

export interface DivisionStandings {
  standings: TeamStanding[];
  h2h: Map<string, Record<string, H2HRecord>>;
  forfeits: Map<string, number>;
  opponents: Map<string, string[]>;
}

/**
 * Build standings from game results for a single division.
 */
export function buildDivisionStandings(games: GameResult[]): DivisionStandings {
  const divMap = new Map<string, TeamStanding>();
  const h2h = new Map<string, Record<string, H2HRecord>>();
  const forfeits = new Map<string, number>();
  const opponents = new Map<string, string[]>();

  for (const game of games) {
    const homeKey = game.homeTeamId || game.homeTeamName;
    const awayKey = game.awayTeamId || game.awayTeamName;

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

    const hs = game.homeScore;
    const as_ = game.awayScore;

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
      if (hs > as_) {
        forfeits.set(awayKey, (forfeits.get(awayKey) || 0) + 1);
      } else if (as_ > hs) {
        forfeits.set(homeKey, (forfeits.get(homeKey) || 0) + 1);
      }
    }

    // Track opponents
    if (!opponents.has(homeKey)) opponents.set(homeKey, []);
    if (!opponents.has(awayKey)) opponents.set(awayKey, []);
    opponents.get(homeKey)!.push(awayKey);
    opponents.get(awayKey)!.push(homeKey);

    // Build head-to-head
    if (!h2h.has(homeKey)) h2h.set(homeKey, {});
    if (!h2h.has(awayKey)) h2h.set(awayKey, {});
    const homeH2H = h2h.get(homeKey)!;
    const awayH2H = h2h.get(awayKey)!;

    if (!homeH2H[awayKey]) homeH2H[awayKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };
    if (!awayH2H[homeKey]) awayH2H[homeKey] = { wins: 0, losses: 0, pf: 0, pa: 0 };

    homeH2H[awayKey]!.pf += hs;
    homeH2H[awayKey]!.pa += as_;
    awayH2H[homeKey]!.pf += as_;
    awayH2H[homeKey]!.pa += hs;

    if (hs > as_) {
      homeH2H[awayKey]!.wins++;
      awayH2H[homeKey]!.losses++;
    } else if (as_ > hs) {
      awayH2H[homeKey]!.wins++;
      homeH2H[awayKey]!.losses++;
    }
  }

  return {
    standings: [...divMap.values()],
    h2h,
    forfeits,
    opponents,
  };
}

/**
 * Build a tiebreaker comparator from ordered rule names.
 */
export function buildComparator(
  divStandings: DivisionStandings,
  tiebreakerRules: string[],
): (a: TeamStanding, b: TeamStanding) => number {
  const { standings, h2h, forfeits, opponents } = divStandings;

  const winPct = (key: string) => {
    const t = standings.find(
      (s) => (s.teamId || s.teamName) === key,
    );
    if (!t || t.gamesPlayed === 0) return 0;
    return (t.wins + t.ties * 0.5) / t.gamesPlayed;
  };

  const getKey = (team: TeamStanding) => team.teamId || team.teamName;

  const comparators: Record<string, (a: TeamStanding, b: TeamStanding) => number> = {
    "Win percentage": (a, b) => {
      const aPct = a.gamesPlayed > 0 ? (a.wins + a.ties * 0.5) / a.gamesPlayed : 0;
      const bPct = b.gamesPlayed > 0 ? (b.wins + b.ties * 0.5) / b.gamesPlayed : 0;
      return bPct - aPct;
    },
    "Head-to-head record": (a, b) => {
      const aKey = getKey(a);
      const bKey = getKey(b);
      const aVsB = h2h.get(aKey)?.[bKey];
      if (!aVsB) return 0;
      return aVsB.losses - aVsB.wins;
    },
    "Point differential": (a, b) => {
      return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
    },
    "Points allowed": (a, b) => {
      return a.pointsAgainst - b.pointsAgainst;
    },
    "Points scored": (a, b) => {
      return b.pointsFor - a.pointsFor;
    },
    "Head-to-head point differential": (a, b) => {
      const aKey = getKey(a);
      const bKey = getKey(b);
      const aVsB = h2h.get(aKey)?.[bKey];
      if (!aVsB) return 0;
      const bVsA = h2h.get(bKey)?.[aKey];
      if (!bVsA) return 0;
      return (aVsB.pa - aVsB.pf) - (bVsA.pa - bVsA.pf);
    },
    "Strength of schedule": (a, b) => {
      const aKey = getKey(a);
      const bKey = getKey(b);
      const aOpps = opponents.get(aKey) || [];
      const bOpps = opponents.get(bKey) || [];
      const aSOS = aOpps.length > 0 ? aOpps.reduce((s, o) => s + winPct(o), 0) / aOpps.length : 0;
      const bSOS = bOpps.length > 0 ? bOpps.reduce((s, o) => s + winPct(o), 0) / bOpps.length : 0;
      return bSOS - aSOS;
    },
    "Fewest forfeits": (a, b) => {
      const aKey = getKey(a);
      const bKey = getKey(b);
      return (forfeits.get(aKey) || 0) - (forfeits.get(bKey) || 0);
    },
  };

  return (a: TeamStanding, b: TeamStanding): number => {
    // Primary: wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // Apply tiebreaker rules
    for (const rule of tiebreakerRules) {
      const cmp = comparators[rule];
      if (cmp) {
        const result = cmp(a, b);
        if (result !== 0) return result;
      }
    }

    // Fallback
    const diff = (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
    if (diff !== 0) return diff;
    return b.pointsFor - a.pointsFor;
  };
}

/**
 * Compute ranked standings for a set of games with tiebreaker rules.
 */
export function computeRankedStandings(
  games: GameResult[],
  tiebreakerRules: string[],
): TeamStanding[] {
  const divStandings = buildDivisionStandings(games);
  const comparator = buildComparator(divStandings, tiebreakerRules);
  const sorted = divStandings.standings.sort(comparator);
  sorted.forEach((team, idx) => {
    team.rank = idx + 1;
  });
  return sorted;
}
