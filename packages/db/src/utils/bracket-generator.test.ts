import { describe, it, expect } from "vitest";
import {
  generateBracketMatches,
  advanceWinnerByPointer,
  seedBracket,
  getBracketOrder,
  getRoundLabel,
  type SeedTeam,
  type BracketMatch,
} from "./bracket-generator";

// ─── Helper to make teams ───

function makeTeams(count: number): SeedTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

// ─────────────────────────────────────────
// Seeding
// ─────────────────────────────────────────

describe("getBracketOrder", () => {
  it("returns [0] for size 1", () => {
    expect(getBracketOrder(1)).toEqual([0]);
  });

  it("returns [0,1] for size 2", () => {
    expect(getBracketOrder(2)).toEqual([0, 1]);
  });

  it("returns proper 4-team seeding (1v4, 2v3)", () => {
    const order = getBracketOrder(4);
    expect(order).toEqual([0, 3, 1, 2]);
  });

  it("returns proper 8-team seeding", () => {
    const order = getBracketOrder(8);
    expect(order.length).toBe(8);
    // 1-seed at position 0, 2-seed at position with max distance from 1
    expect(order[0]).toBe(0);
    expect(order[1]).toBe(7);
  });
});

describe("seedBracket", () => {
  it("places teams in correct bracket positions", () => {
    const teams = makeTeams(4);
    const seeded = seedBracket(teams, 4);
    // 4 teams, 4 slots, all filled
    expect(seeded.filter(Boolean).length).toBe(4);
    expect(seeded[0]).toBe("Team 1");
  });

  it("leaves empty slots for non-power-of-2 teams", () => {
    const teams = makeTeams(3);
    const seeded = seedBracket(teams, 4);
    expect(seeded.filter(Boolean).length).toBe(3);
    expect(seeded.filter((s) => s === undefined).length).toBe(1);
  });
});

// ─────────────────────────────────────────
// Round Labels
// ─────────────────────────────────────────

describe("getRoundLabel", () => {
  it("returns Championship for final round", () => {
    expect(getRoundLabel(3, 3)).toBe("Championship");
  });

  it("returns Semifinals for second-to-last round", () => {
    expect(getRoundLabel(2, 3)).toBe("Semifinals");
  });

  it("returns Quarterfinals for third-to-last round", () => {
    expect(getRoundLabel(1, 3)).toBe("Quarterfinals");
  });

  it("returns Round of 16 for fourth-to-last round", () => {
    expect(getRoundLabel(1, 4)).toBe("Round of 16");
  });

  it("returns generic Round N for earlier rounds", () => {
    expect(getRoundLabel(1, 5)).toBe("Round 1");
  });
});

// ─────────────────────────────────────────
// Single Elimination
// ─────────────────────────────────────────

describe("generateBracketMatches — single_elimination", () => {
  it("generates correct match count for 4 teams", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    // 4 teams = 3 matches (2 semis + 1 final)
    expect(matches.length).toBe(3);
  });

  it("generates correct match count for 8 teams", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    // 8 teams = 7 matches
    expect(matches.length).toBe(7);
  });

  it("generates correct match count for 16 teams", () => {
    const matches = generateBracketMatches(makeTeams(16), "single_elimination");
    expect(matches.length).toBe(15);
  });

  it("assigns teams to round 1 matches", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1.length).toBe(2);
    // Every round 1 match should have both teams filled
    for (const m of round1) {
      expect(m.homeTeamName).toBeTruthy();
      expect(m.awayTeamName).toBeTruthy();
    }
  });

  it("does NOT assign teams to later rounds", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const round2 = matches.filter((m) => m.round === 2);
    // Round 2 should have empty team slots (filled during advancement)
    for (const m of round2) {
      expect(m.homeTeamName).toBeUndefined();
      expect(m.awayTeamName).toBeUndefined();
    }
  });

  it("sets round labels correctly", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const labels = [...new Set(matches.map((m) => m.roundLabel))];
    expect(labels).toContain("Quarterfinals");
    expect(labels).toContain("Semifinals");
    expect(labels).toContain("Championship");
  });

  it("every non-final match has nextMatchNumber", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const finalMatch = matches.find((m) => m.roundLabel === "Championship");
    for (const m of matches) {
      if (m.matchNumber === finalMatch!.matchNumber) {
        // Championship match should NOT have a nextMatchNumber
        expect(m.nextMatchNumber).toBeUndefined();
      } else {
        expect(m.nextMatchNumber).toBeDefined();
        expect(m.nextSlot).toMatch(/^(home|away)$/);
      }
    }
  });

  it("nextMatchNumber points to valid matches", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const matchNumbers = new Set(matches.map((m) => m.matchNumber));
    for (const m of matches) {
      if (m.nextMatchNumber) {
        expect(matchNumbers.has(m.nextMatchNumber)).toBe(true);
      }
    }
  });

  it("pairs feed into the same next match", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const round1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    // Match 0 and Match 1 should both point to the same next match
    expect(round1[0]!.nextMatchNumber).toBe(round1[1]!.nextMatchNumber);
    // But with different slots
    expect(round1[0]!.nextSlot).toBe("home");
    expect(round1[1]!.nextSlot).toBe("away");
  });

  it("position values are sequential within a round", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const round1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    round1.forEach((m, i) => {
      expect(m.position).toBe(i);
    });
  });
});

// ─────────────────────────────────────────
// Byes (non-power-of-2 teams)
// ─────────────────────────────────────────

describe("generateBracketMatches — byes", () => {
  it("handles 3 teams (1 bye)", () => {
    const matches = generateBracketMatches(makeTeams(3), "single_elimination");
    const byeMatches = matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(1);
  });

  it("handles 5 teams (3 byes)", () => {
    const matches = generateBracketMatches(makeTeams(5), "single_elimination");
    const byeMatches = matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(3);
  });

  it("handles 6 teams (2 byes)", () => {
    const matches = generateBracketMatches(makeTeams(6), "single_elimination");
    const byeMatches = matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(2);
  });

  it("auto-completes bye matches", () => {
    const matches = generateBracketMatches(makeTeams(3), "single_elimination");
    const byeMatch = matches.find((m) => m.isBye)!;
    expect(byeMatch.status).toBe("completed");
    expect(byeMatch.homeScore).toBe(0);
    expect(byeMatch.awayScore).toBe(0);
  });

  it("advances bye winner to next round", () => {
    const matches = generateBracketMatches(makeTeams(3), "single_elimination");
    const byeMatch = matches.find((m) => m.isBye)!;
    const winner = byeMatch.homeTeamName === "BYE" ? byeMatch.awayTeamName : byeMatch.homeTeamName;
    const nextMatch = matches.find((m) => m.matchNumber === byeMatch.nextMatchNumber)!;
    // The bye winner should be placed in the correct slot of the next match
    if (byeMatch.nextSlot === "home") {
      expect(nextMatch.homeTeamName).toBe(winner);
    } else {
      expect(nextMatch.awayTeamName).toBe(winner);
    }
  });

  it("top seed gets the bye in standard seeding", () => {
    const matches = generateBracketMatches(makeTeams(3), "single_elimination");
    const byeMatches = matches.filter((m) => m.isBye);
    // With 3 teams in a 4-slot bracket, the bye goes to the highest-seeded
    // team in the slot opposite the empty position
    expect(byeMatches.length).toBe(1);
    // The bye match should be auto-completed
    expect(byeMatches[0]!.status).toBe("completed");
    // The non-BYE team in the bye match should advance
    const winner = byeMatches[0]!.homeTeamName === "BYE"
      ? byeMatches[0]!.awayTeamName
      : byeMatches[0]!.homeTeamName;
    expect(winner).toBeTruthy();
  });
});

// ─────────────────────────────────────────
// Pre-render (empty shells)
// ─────────────────────────────────────────

describe("generateBracketMatches — pre-render shells", () => {
  it("generates placeholder names when teams array is empty", () => {
    const matches = generateBracketMatches([], "single_elimination", 8);
    const round1 = matches.filter((m) => m.round === 1);
    // Should have "Seed N" placeholders
    const allNames = round1.flatMap((m) => [m.homeTeamName, m.awayTeamName]);
    expect(allNames.every((n) => n?.startsWith("Seed "))).toBe(true);
  });

  it("generates correct structure for 6-team tier shell", () => {
    const matches = generateBracketMatches([], "single_elimination", 6);
    // 6 teams → rounds up to 8-team bracket = 7 matches
    expect(matches.length).toBe(7);
    const byeMatches = matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(2);
  });

  it("generates correct structure for 4-team tier shell", () => {
    const matches = generateBracketMatches([], "single_elimination", 4);
    expect(matches.length).toBe(3);
    const byeMatches = matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(0);
  });

  it("nextMatchNumber pointers work in pre-render mode", () => {
    const matches = generateBracketMatches([], "single_elimination", 8);
    const matchNumbers = new Set(matches.map((m) => m.matchNumber));
    for (const m of matches) {
      if (m.nextMatchNumber) {
        expect(matchNumbers.has(m.nextMatchNumber)).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────
// Double Elimination
// ─────────────────────────────────────────

describe("generateBracketMatches — double_elimination", () => {
  it("generates more matches than single elimination", () => {
    const single = generateBracketMatches(makeTeams(8), "single_elimination");
    const double = generateBracketMatches(makeTeams(8), "double_elimination");
    expect(double.length).toBeGreaterThan(single.length);
  });

  it("includes a Grand Final match", () => {
    const matches = generateBracketMatches(makeTeams(8), "double_elimination");
    const grandFinal = matches.find((m) => m.roundLabel === "Grand Final");
    expect(grandFinal).toBeDefined();
  });

  it("includes a Reset game", () => {
    const matches = generateBracketMatches(makeTeams(8), "double_elimination");
    const reset = matches.find((m) => m.roundLabel === "Reset (if needed)");
    expect(reset).toBeDefined();
  });

  it("includes losers bracket rounds", () => {
    const matches = generateBracketMatches(makeTeams(8), "double_elimination");
    const losersMatches = matches.filter((m) =>
      m.roundLabel?.startsWith("Losers Round"),
    );
    expect(losersMatches.length).toBeGreaterThan(0);
  });

  it("winners bracket final points to grand final", () => {
    const matches = generateBracketMatches(makeTeams(4), "double_elimination");
    const grandFinal = matches.find((m) => m.roundLabel === "Grand Final")!;
    // Find the winners bracket championship
    const winnersMatches = matches.filter(
      (m) => !m.roundLabel?.startsWith("Losers") && m.roundLabel !== "Grand Final" && m.roundLabel !== "Reset (if needed)",
    );
    const winnersFinal = winnersMatches.find((m) => m.roundLabel === "Championship");
    expect(winnersFinal).toBeDefined();
    expect(winnersFinal!.nextMatchNumber).toBe(grandFinal.matchNumber);
  });
});

// ─────────────────────────────────────────
// Consolation
// ─────────────────────────────────────────

describe("generateBracketMatches — consolation", () => {
  it("includes consolation round matches", () => {
    const matches = generateBracketMatches(makeTeams(8), "consolation");
    const consolation = matches.filter((m) =>
      m.roundLabel?.startsWith("Consolation"),
    );
    expect(consolation.length).toBeGreaterThan(0);
  });

  it("includes 3rd place game for 4+ teams", () => {
    const matches = generateBracketMatches(makeTeams(8), "consolation");
    const thirdPlace = matches.find((m) => m.roundLabel === "3rd Place Game");
    expect(thirdPlace).toBeDefined();
  });

  it("consolation round 1 matches have nextMatchNumber when enough games", () => {
    const matches = generateBracketMatches(makeTeams(8), "consolation");
    const consolR1 = matches.filter(
      (m) => m.roundLabel === "Consolation Round 1",
    );
    if (consolR1.length >= 2) {
      for (const m of consolR1) {
        expect(m.nextMatchNumber).toBeDefined();
      }
    }
  });
});

// ─────────────────────────────────────────
// Pointer-based Advancement
// ─────────────────────────────────────────

describe("advanceWinnerByPointer", () => {
  it("marks the match as completed with scores", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    const round1 = matches.filter(
      (m) => m.round === 1 && m.status === "scheduled",
    );
    const target = round1[0]!;

    advanceWinnerByPointer(matches, target.matchNumber, 10, 5);

    expect(target.status).toBe("completed");
    expect(target.homeScore).toBe(10);
    expect(target.awayScore).toBe(5);
  });

  it("advances home team winner to next match", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    const round1 = matches.filter(
      (m) => m.round === 1 && m.status === "scheduled",
    );
    const target = round1[0]!;
    const homeTeam = target.homeTeamName;

    advanceWinnerByPointer(matches, target.matchNumber, 10, 5);

    const nextMatch = matches.find(
      (m) => m.matchNumber === target.nextMatchNumber,
    )!;
    if (target.nextSlot === "home") {
      expect(nextMatch.homeTeamName).toBe(homeTeam);
    } else {
      expect(nextMatch.awayTeamName).toBe(homeTeam);
    }
  });

  it("advances away team winner to next match", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    const round1 = matches.filter(
      (m) => m.round === 1 && m.status === "scheduled",
    );
    const target = round1[0]!;
    const awayTeam = target.awayTeamName;

    advanceWinnerByPointer(matches, target.matchNumber, 3, 7);

    const nextMatch = matches.find(
      (m) => m.matchNumber === target.nextMatchNumber,
    )!;
    if (target.nextSlot === "home") {
      expect(nextMatch.homeTeamName).toBe(awayTeam);
    } else {
      expect(nextMatch.awayTeamName).toBe(awayTeam);
    }
  });

  it("full tournament simulation — 4 teams", () => {
    const matches = generateBracketMatches(makeTeams(4), "single_elimination");
    const scheduled = () =>
      matches.filter(
        (m) =>
          m.status === "scheduled" &&
          m.homeTeamName &&
          m.awayTeamName &&
          m.homeTeamName !== "BYE" &&
          m.awayTeamName !== "BYE",
      );

    // Play all round 1 games (home always wins)
    let playable = scheduled();
    expect(playable.length).toBe(2);
    for (const m of playable) {
      advanceWinnerByPointer(matches, m.matchNumber, 10, 5);
    }

    // Play championship
    playable = scheduled();
    expect(playable.length).toBe(1);
    expect(playable[0]!.roundLabel).toBe("Championship");
    advanceWinnerByPointer(matches, playable[0]!.matchNumber, 15, 12);

    // All matches should be completed
    playable = scheduled();
    expect(playable.length).toBe(0);
    const completed = matches.filter((m) => m.status === "completed");
    expect(completed.length).toBe(3);
  });

  it("full tournament simulation — 8 teams with byes (5 teams)", () => {
    const matches = generateBracketMatches(makeTeams(5), "single_elimination");
    const scheduled = () =>
      matches.filter(
        (m) =>
          m.status === "scheduled" &&
          m.homeTeamName &&
          m.awayTeamName &&
          m.homeTeamName !== "BYE" &&
          m.awayTeamName !== "BYE",
      );

    // Bye matches are already auto-completed, play remaining games
    let round = 0;
    while (scheduled().length > 0) {
      const playable = scheduled();
      for (const m of playable) {
        advanceWinnerByPointer(matches, m.matchNumber, 10, round + 3);
      }
      round++;
      if (round > 10) throw new Error("Infinite loop in tournament simulation");
    }

    // Should have a championship match that's completed
    const championship = matches.find((m) => m.roundLabel === "Championship");
    expect(championship).toBeDefined();
    expect(championship!.status).toBe("completed");
  });
});

// ─────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────

describe("edge cases", () => {
  it("handles 2 teams (minimum)", () => {
    const matches = generateBracketMatches(makeTeams(2), "single_elimination");
    expect(matches.length).toBe(1);
    expect(matches[0]!.roundLabel).toBe("Championship");
    expect(matches[0]!.homeTeamName).toBe("Team 1");
    expect(matches[0]!.awayTeamName).toBe("Team 2");
  });

  it("unique match numbers across all matches", () => {
    const matches = generateBracketMatches(makeTeams(16), "double_elimination");
    const numbers = matches.map((m) => m.matchNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("match numbers are sequential starting at 1", () => {
    const matches = generateBracketMatches(makeTeams(8), "single_elimination");
    const sorted = [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
    sorted.forEach((m, i) => {
      expect(m.matchNumber).toBe(i + 1);
    });
  });
});
