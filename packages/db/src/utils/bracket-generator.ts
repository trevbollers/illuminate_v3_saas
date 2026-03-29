/**
 * Pure bracket generation functions — no DB dependencies.
 * Used by the brackets API route and unit tests.
 */

export interface SeedTeam {
  name: string;
  seed: number;
}

export interface BracketMatch {
  matchNumber: number;
  round: number;
  roundLabel?: string;
  position: number;
  nextMatchNumber?: number;
  nextSlot?: "home" | "away";
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  isBye?: boolean;
  status: "scheduled" | "in_progress" | "completed" | "canceled";
}

export function getRoundLabel(round: number, totalRounds: number): string {
  const remaining = totalRounds - round;
  if (remaining === 0) return "Championship";
  if (remaining === 1) return "Semifinals";
  if (remaining === 2) return "Quarterfinals";
  if (remaining === 3) return "Round of 16";
  return `Round ${round}`;
}

/**
 * Generate pre-rendered bracket matches with full next-match pointers.
 * Every match knows exactly where its winner goes (matchNumber + slot),
 * so advancement is pure pointer-following with zero computation.
 *
 * Supports: single_elimination, double_elimination, consolation.
 * If `teams` is empty, generates placeholder slots ("Seed 1", "Seed 2", etc.)
 * for pre-rendering bracket shells before teams are assigned.
 */
export function generateBracketMatches(
  teams: SeedTeam[],
  bracketType: string,
  teamCount?: number,
): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const count = teamCount || teams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(count, 2))));
  const totalRounds = Math.log2(bracketSize);

  let seeded: (string | undefined)[];
  if (teams.length > 0) {
    seeded = seedBracket(teams, bracketSize);
  } else {
    const placeholders: SeedTeam[] = [];
    for (let i = 1; i <= count; i++) {
      placeholders.push({ name: `Seed ${i}`, seed: i });
    }
    seeded = seedBracket(placeholders, bracketSize);
  }

  let matchNumber = 1;
  const roundMatchNumbers: number[][] = [];

  // ─── Winners bracket ───
  let gamesInRound = bracketSize / 2;
  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches: number[] = [];
    for (let g = 0; g < gamesInRound; g++) {
      const match: BracketMatch = {
        matchNumber: matchNumber,
        round,
        roundLabel: getRoundLabel(round, totalRounds),
        position: g,
        status: "scheduled",
      };

      if (round === 1) {
        const homeIdx = g * 2;
        const awayIdx = g * 2 + 1;
        match.homeTeamName = seeded[homeIdx] || undefined;
        match.awayTeamName = seeded[awayIdx] || undefined;

        if (match.homeTeamName && !match.awayTeamName) {
          match.awayTeamName = "BYE";
          match.isBye = true;
        }
        if (!match.homeTeamName && match.awayTeamName) {
          match.homeTeamName = "BYE";
          match.isBye = true;
        }
      }

      roundMatches.push(matchNumber);
      matches.push(match);
      matchNumber++;
    }
    roundMatchNumbers.push(roundMatches);
    gamesInRound = Math.floor(gamesInRound / 2);
  }

  // Wire nextMatchNumber/nextSlot pointers for winners bracket
  for (let r = 0; r < roundMatchNumbers.length - 1; r++) {
    const currentRound = roundMatchNumbers[r]!;
    const nextRound = roundMatchNumbers[r + 1]!;
    for (let g = 0; g < currentRound.length; g++) {
      const match = matches.find((m) => m.matchNumber === currentRound[g])!;
      const nextMatchNum = nextRound[Math.floor(g / 2)]!;
      match.nextMatchNumber = nextMatchNum;
      match.nextSlot = g % 2 === 0 ? "home" : "away";
    }
  }

  // ─── Double elimination ───
  if (bracketType === "double_elimination") {
    const losersRounds = (totalRounds - 1) * 2;
    let losersGames = bracketSize / 4;
    const losersRoundMatchNums: number[][] = [];

    for (let lr = 1; lr <= losersRounds; lr++) {
      const round = totalRounds + lr;
      const roundMatches: number[] = [];

      for (let g = 0; g < losersGames; g++) {
        matches.push({
          matchNumber: matchNumber,
          round,
          roundLabel: `Losers Round ${lr}`,
          position: g,
          status: "scheduled",
        });
        roundMatches.push(matchNumber);
        matchNumber++;
      }
      losersRoundMatchNums.push(roundMatches);

      if (lr % 2 === 0) {
        losersGames = Math.max(1, Math.floor(losersGames / 2));
      }
    }

    // Wire losers bracket nextMatchNumber pointers
    for (let lr = 0; lr < losersRoundMatchNums.length - 1; lr++) {
      const currentRound = losersRoundMatchNums[lr]!;
      const nextRound = losersRoundMatchNums[lr + 1]!;
      for (let g = 0; g < currentRound.length; g++) {
        const match = matches.find((m) => m.matchNumber === currentRound[g])!;
        if (currentRound.length === nextRound.length) {
          match.nextMatchNumber = nextRound[g]!;
          match.nextSlot = "home";
        } else {
          match.nextMatchNumber = nextRound[Math.floor(g / 2)]!;
          match.nextSlot = g % 2 === 0 ? "home" : "away";
        }
      }
    }

    // Grand final
    const grandFinalNum = matchNumber;
    matches.push({
      matchNumber: matchNumber,
      round: totalRounds + losersRounds + 1,
      roundLabel: "Grand Final",
      position: 0,
      nextMatchNumber: matchNumber + 1,
      nextSlot: "home",
      status: "scheduled",
    });
    matchNumber++;

    // Wire winners bracket final → grand final
    const winnersFinalMatch = matches.find(
      (m) => m.matchNumber === roundMatchNumbers[roundMatchNumbers.length - 1]![0],
    );
    if (winnersFinalMatch) {
      winnersFinalMatch.nextMatchNumber = grandFinalNum;
      winnersFinalMatch.nextSlot = "home";
    }

    // Wire losers bracket final → grand final
    if (losersRoundMatchNums.length > 0) {
      const lastLosersRound = losersRoundMatchNums[losersRoundMatchNums.length - 1]!;
      const losersFinalMatch = matches.find((m) => m.matchNumber === lastLosersRound[0]);
      if (losersFinalMatch) {
        losersFinalMatch.nextMatchNumber = grandFinalNum;
        losersFinalMatch.nextSlot = "away";
      }
    }

    // Reset game
    matches.push({
      matchNumber: matchNumber,
      round: totalRounds + losersRounds + 2,
      roundLabel: "Reset (if needed)",
      position: 0,
      status: "scheduled",
    });
    matchNumber++;
  }

  // ─── Consolation bracket ───
  if (bracketType === "consolation") {
    const consolationRound = totalRounds + 1;
    const firstRoundMatches = matches.filter((m) => m.round === 1);
    const consolationGamesCount = Math.floor(firstRoundMatches.length / 2);
    const consolRound1Nums: number[] = [];

    for (let g = 0; g < consolationGamesCount; g++) {
      consolRound1Nums.push(matchNumber);
      matches.push({
        matchNumber: matchNumber,
        round: consolationRound,
        roundLabel: "Consolation Round 1",
        position: g,
        status: "scheduled",
      });
      matchNumber++;
    }

    if (consolationGamesCount >= 2) {
      const consolSemiCount = Math.floor(consolationGamesCount / 2);
      const consolSemiNums: number[] = [];

      for (let g = 0; g < consolSemiCount; g++) {
        consolSemiNums.push(matchNumber);
        matches.push({
          matchNumber: matchNumber,
          round: consolationRound + 1,
          roundLabel: "Consolation Semifinals",
          position: g,
          status: "scheduled",
        });
        matchNumber++;
      }

      // Wire consolation round 1 → semifinals
      for (let g = 0; g < consolRound1Nums.length; g++) {
        const match = matches.find((m) => m.matchNumber === consolRound1Nums[g])!;
        match.nextMatchNumber = consolSemiNums[Math.floor(g / 2)]!;
        match.nextSlot = g % 2 === 0 ? "home" : "away";
      }
    }

    // 3rd place game
    if (totalRounds >= 2) {
      matches.push({
        matchNumber: matchNumber,
        round: consolationRound + (consolationGamesCount >= 2 ? 2 : 1),
        roundLabel: "3rd Place Game",
        position: 0,
        status: "scheduled",
      });
      matchNumber++;
    }
  }

  // Auto-complete BYE matches and advance winners via pointers
  for (const m of matches) {
    if (!m.isBye) continue;
    const winner = m.homeTeamName === "BYE" ? m.awayTeamName : m.homeTeamName;
    if (winner && m.nextMatchNumber) {
      m.homeScore = 0;
      m.awayScore = 0;
      m.status = "completed";
      const nextMatch = matches.find((nm) => nm.matchNumber === m.nextMatchNumber);
      if (nextMatch) {
        if (m.nextSlot === "home") {
          nextMatch.homeTeamName = winner;
        } else {
          nextMatch.awayTeamName = winner;
        }
      }
    }
  }

  return matches;
}

export function seedBracket(teams: SeedTeam[], bracketSize: number): (string | undefined)[] {
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

export function getBracketOrder(size: number): number[] {
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

/**
 * Simulate advancing a winner through the bracket using stored pointers.
 * Pure function — mutates the matches array in place.
 */
export function advanceWinnerByPointer(
  matches: BracketMatch[],
  matchNumber: number,
  homeScore: number,
  awayScore: number,
): BracketMatch[] {
  const match = matches.find((m) => m.matchNumber === matchNumber);
  if (!match) return matches;

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = "completed";

  const winnerName = homeScore > awayScore ? match.homeTeamName : match.awayTeamName;

  if (winnerName && match.nextMatchNumber) {
    const nextMatch = matches.find((m) => m.matchNumber === match.nextMatchNumber);
    if (nextMatch) {
      if (match.nextSlot === "home") {
        nextMatch.homeTeamName = winnerName;
      } else {
        nextMatch.awayTeamName = winnerName;
      }
    }
  }

  return matches;
}
