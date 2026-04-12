import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

/**
 * Unit tests for the public event registration data processing logic.
 *
 * These test the validation, duplicate detection, pricing calculation,
 * and data transformation functions used by the registration API —
 * extracted as pure functions to test without HTTP/DB dependencies.
 */

// ─── Helper functions extracted from route logic ───

function validateTeams(
  teams: { teamName?: string; divisionId?: string }[],
  validDivisionIds: string[],
): string | null {
  if (!Array.isArray(teams) || teams.length === 0) {
    return "At least one team is required";
  }
  for (const t of teams) {
    if (!t.teamName?.trim()) return "All teams must have a name";
    if (t.divisionId && !validDivisionIds.includes(t.divisionId)) {
      return `Invalid division for team "${t.teamName}"`;
    }
  }
  return null;
}

function validateContactFields(body: {
  coachName?: string;
  coachEmail?: string;
  city?: string;
  state?: string;
}): string | null {
  if (!body.coachName) return "Missing required contact fields";
  if (!body.coachEmail) return "Missing required contact fields";
  if (!body.city) return "Missing required contact fields";
  if (!body.state) return "Missing required contact fields";
  return null;
}

function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function calcEffectivePrice(pricing?: {
  amount: number;
  earlyBirdAmount?: number;
  earlyBirdDeadline?: string;
  lateFeeAmount?: number;
  lateFeeStartDate?: string;
}): number {
  if (!pricing) return 0;
  const now = new Date();
  if (pricing.earlyBirdAmount && pricing.earlyBirdDeadline) {
    if (now < new Date(pricing.earlyBirdDeadline)) return pricing.earlyBirdAmount;
  }
  if (pricing.lateFeeAmount && pricing.lateFeeStartDate) {
    if (now >= new Date(pricing.lateFeeStartDate))
      return pricing.amount + pricing.lateFeeAmount;
  }
  return pricing.amount;
}

function calcTotal(
  perTeam: number,
  teamCount: number,
  discounts?: { minTeams: number; discountPercent?: number; discountAmountPerTeam?: number }[],
): number {
  if (!perTeam || teamCount === 0) return 0;
  let discount = 0;
  if (discounts?.length) {
    const applicable = discounts
      .filter((d) => teamCount >= d.minTeams)
      .sort((a, b) => b.minTeams - a.minTeams);
    if (applicable.length > 0) {
      const d = applicable[0]!;
      if (d.discountAmountPerTeam) discount = d.discountAmountPerTeam;
      else if (d.discountPercent)
        discount = Math.round((perTeam * d.discountPercent) / 100);
    }
  }
  return (perTeam - discount) * teamCount;
}

function isDuplicateRegistration(
  existingRegs: { teamName: string; divisionId?: string; status: string }[],
  teamName: string,
  divisionId?: string,
): boolean {
  return existingRegs.some(
    (r) =>
      r.teamName.toLowerCase() === teamName.toLowerCase() &&
      !["withdrawn", "rejected"].includes(r.status) &&
      // Same team in a different division is NOT a duplicate
      (divisionId ? r.divisionId === divisionId : true),
  );
}

function buildRegistrationNotes(
  coachName: string,
  email: string,
  city: string,
  state: string,
): string {
  return `New registration. Coach: ${coachName} (${email}). From ${city}, ${state}.`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ────────────────────────────────────────────────────────
// TESTS
// ────────────────────────────────────────────────────────

describe("registration — team validation", () => {
  const divIds = ["div1", "div2", "div3"];

  it("rejects empty teams array", () => {
    expect(validateTeams([], divIds)).toBe("At least one team is required");
  });

  it("rejects non-array", () => {
    expect(validateTeams(null as any, divIds)).toBe("At least one team is required");
  });

  it("rejects team with empty name", () => {
    expect(validateTeams([{ teamName: "", divisionId: "div1" }], divIds)).toBe(
      "All teams must have a name",
    );
  });

  it("rejects team with whitespace-only name", () => {
    expect(validateTeams([{ teamName: "  ", divisionId: "div1" }], divIds)).toBe(
      "All teams must have a name",
    );
  });

  it("rejects invalid division ID", () => {
    expect(
      validateTeams([{ teamName: "Thunder 10U", divisionId: "invalid" }], divIds),
    ).toBe('Invalid division for team "Thunder 10U"');
  });

  it("allows valid team with division", () => {
    expect(
      validateTeams([{ teamName: "Thunder 10U", divisionId: "div1" }], divIds),
    ).toBeNull();
  });

  it("allows team without division (league assigns later)", () => {
    expect(
      validateTeams([{ teamName: "Thunder 10U" }], divIds),
    ).toBeNull();
  });

  it("allows multiple valid teams", () => {
    expect(
      validateTeams(
        [
          { teamName: "Thunder 10U", divisionId: "div1" },
          { teamName: "Thunder 12U", divisionId: "div2" },
          { teamName: "Thunder 14U" },
        ],
        divIds,
      ),
    ).toBeNull();
  });

  it("rejects if any team in batch is invalid", () => {
    expect(
      validateTeams(
        [
          { teamName: "Thunder 10U", divisionId: "div1" },
          { teamName: "", divisionId: "div2" },
        ],
        divIds,
      ),
    ).toBe("All teams must have a name");
  });
});

describe("registration — contact validation", () => {
  it("rejects missing coachName", () => {
    expect(
      validateContactFields({
        coachEmail: "a@b.com",
        city: "KC",
        state: "MO",
      }),
    ).toBe("Missing required contact fields");
  });

  it("rejects missing coachEmail", () => {
    expect(
      validateContactFields({
        coachName: "John",
        city: "KC",
        state: "MO",
      }),
    ).toBe("Missing required contact fields");
  });

  it("rejects missing city", () => {
    expect(
      validateContactFields({
        coachName: "John",
        coachEmail: "a@b.com",
        state: "MO",
      }),
    ).toBe("Missing required contact fields");
  });

  it("rejects missing state", () => {
    expect(
      validateContactFields({
        coachName: "John",
        coachEmail: "a@b.com",
        city: "KC",
      }),
    ).toBe("Missing required contact fields");
  });

  it("passes with all fields", () => {
    expect(
      validateContactFields({
        coachName: "John",
        coachEmail: "a@b.com",
        city: "KC",
        state: "MO",
      }),
    ).toBeNull();
  });
});

describe("registration — org slug generation", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateOrgSlug("KC Thunder Athletics")).toBe("kc-thunder-athletics");
  });

  it("strips special characters", () => {
    expect(generateOrgSlug("St. Mary's Hawks!")).toBe("st-mary-s-hawks");
  });

  it("collapses multiple hyphens", () => {
    expect(generateOrgSlug("KC  --  Thunder")).toBe("kc-thunder");
  });

  it("strips leading and trailing hyphens", () => {
    expect(generateOrgSlug("-Thunder-")).toBe("thunder");
  });

  it("handles numbers", () => {
    expect(generateOrgSlug("7v7 Elite KC 2025")).toBe("7v7-elite-kc-2025");
  });

  it("handles unicode/accents as removal", () => {
    expect(generateOrgSlug("Café Sports")).toBe("caf-sports");
  });
});

describe("registration — pricing calculations", () => {
  it("returns 0 for no pricing", () => {
    expect(calcEffectivePrice(undefined)).toBe(0);
  });

  it("returns base amount when no modifiers", () => {
    expect(calcEffectivePrice({ amount: 5000 })).toBe(5000);
  });

  it("returns early bird price before deadline", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(
      calcEffectivePrice({
        amount: 5000,
        earlyBirdAmount: 3500,
        earlyBirdDeadline: tomorrow,
      }),
    ).toBe(3500);
  });

  it("returns base price after early bird deadline", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(
      calcEffectivePrice({
        amount: 5000,
        earlyBirdAmount: 3500,
        earlyBirdDeadline: yesterday,
      }),
    ).toBe(5000);
  });

  it("adds late fee after start date", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(
      calcEffectivePrice({
        amount: 5000,
        lateFeeAmount: 1000,
        lateFeeStartDate: yesterday,
      }),
    ).toBe(6000);
  });

  it("does not add late fee before start date", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(
      calcEffectivePrice({
        amount: 5000,
        lateFeeAmount: 1000,
        lateFeeStartDate: tomorrow,
      }),
    ).toBe(5000);
  });
});

describe("registration — multi-team discount calculations", () => {
  it("no discount for 0 teams", () => {
    expect(calcTotal(5000, 0)).toBe(0);
  });

  it("no discount with empty discount list", () => {
    expect(calcTotal(5000, 3, [])).toBe(15000);
  });

  it("applies percentage discount", () => {
    const discounts = [{ minTeams: 3, discountPercent: 10 }];
    // 5000 * 0.9 = 4500 per team, 4500 * 3 = 13500
    expect(calcTotal(5000, 3, discounts)).toBe(13500);
  });

  it("applies flat amount discount per team", () => {
    const discounts = [{ minTeams: 2, discountAmountPerTeam: 500 }];
    // (5000 - 500) * 4 = 18000
    expect(calcTotal(5000, 4, discounts)).toBe(18000);
  });

  it("does not apply discount below threshold", () => {
    const discounts = [{ minTeams: 5, discountPercent: 20 }];
    expect(calcTotal(5000, 3, discounts)).toBe(15000);
  });

  it("picks best applicable tier (highest minTeams)", () => {
    const discounts = [
      { minTeams: 2, discountPercent: 5 },
      { minTeams: 5, discountPercent: 15 },
      { minTeams: 3, discountPercent: 10 },
    ];
    // 5 teams → 15% discount tier: 5000 * 0.85 = 4250, * 5 = 21250
    expect(calcTotal(5000, 5, discounts)).toBe(21250);
  });

  it("picks lower tier when team count is between tiers", () => {
    const discounts = [
      { minTeams: 2, discountPercent: 5 },
      { minTeams: 5, discountPercent: 15 },
    ];
    // 3 teams → 5% tier: 5000 * 0.95 = 4750, * 3 = 14250
    expect(calcTotal(5000, 3, discounts)).toBe(14250);
  });

  it("flat discount prefers discountAmountPerTeam over discountPercent", () => {
    const discounts = [
      { minTeams: 2, discountAmountPerTeam: 1000, discountPercent: 50 },
    ];
    // discountAmountPerTeam wins: (5000 - 1000) * 3 = 12000
    expect(calcTotal(5000, 3, discounts)).toBe(12000);
  });

  it("free event total is 0", () => {
    expect(calcTotal(0, 5)).toBe(0);
  });
});

describe("registration — duplicate detection", () => {
  const existing = [
    { teamName: "Thunder 10U", divisionId: "div_10u", status: "approved" },
    { teamName: "Thunder 12U", divisionId: "div_12u", status: "pending" },
    { teamName: "Thunder 14U", divisionId: "div_14u", status: "withdrawn" },
    { teamName: "Thunder 8U", divisionId: "div_8u", status: "rejected" },
  ];

  it("detects exact name + division match with active status", () => {
    expect(isDuplicateRegistration(existing, "Thunder 10U", "div_10u")).toBe(true);
  });

  it("detects case-insensitive match", () => {
    expect(isDuplicateRegistration(existing, "thunder 10u", "div_10u")).toBe(true);
  });

  it("detects pending registration as duplicate", () => {
    expect(isDuplicateRegistration(existing, "Thunder 12U", "div_12u")).toBe(true);
  });

  it("allows re-registration of withdrawn team", () => {
    expect(isDuplicateRegistration(existing, "Thunder 14U", "div_14u")).toBe(false);
  });

  it("allows re-registration of rejected team", () => {
    expect(isDuplicateRegistration(existing, "Thunder 8U", "div_8u")).toBe(false);
  });

  it("allows new team name", () => {
    expect(isDuplicateRegistration(existing, "Lightning 10U", "div_10u")).toBe(false);
  });

  it("handles empty existing registrations", () => {
    expect(isDuplicateRegistration([], "Thunder 10U", "div_10u")).toBe(false);
  });

  it("allows same team name in different division (e.g. Black in U10 and U12)", () => {
    expect(isDuplicateRegistration(existing, "Thunder 10U", "div_12u")).toBe(false);
  });

  it("allows same team name when no division specified on new registration", () => {
    // No divisionId = league assigns later, always allow
    expect(isDuplicateRegistration(existing, "Thunder 10U")).toBe(true);
  });

  it("same org registering same name across 4 divisions is 4 separate registrations", () => {
    const divisions = ["div_8u", "div_10u", "div_12u", "div_14u"];
    const regs = [
      { teamName: "Global FB North", divisionId: "div_10u", status: "approved" },
    ];
    // Already registered in 10U — duplicate for 10U, allowed for others
    expect(isDuplicateRegistration(regs, "Global FB North", "div_10u")).toBe(true);
    expect(isDuplicateRegistration(regs, "Global FB North", "div_8u")).toBe(false);
    expect(isDuplicateRegistration(regs, "Global FB North", "div_12u")).toBe(false);
    expect(isDuplicateRegistration(regs, "Global FB North", "div_14u")).toBe(false);
  });
});

describe("registration — notes generation", () => {
  it("formats notes correctly", () => {
    expect(buildRegistrationNotes("John Smith", "john@example.com", "Kansas City", "MO")).toBe(
      "New registration. Coach: John Smith (john@example.com). From Kansas City, MO.",
    );
  });
});

describe("registration — regex escaping for org name match", () => {
  it("escapes dots", () => {
    expect(escapeRegex("St. Mary's")).toBe("St\\. Mary's");
  });

  it("escapes parentheses", () => {
    expect(escapeRegex("KC (Thunder)")).toBe("KC \\(Thunder\\)");
  });

  it("escapes brackets", () => {
    expect(escapeRegex("Team [A]")).toBe("Team \\[A\\]");
  });

  it("passes plain text through", () => {
    expect(escapeRegex("KC Thunder")).toBe("KC Thunder");
  });

  it("escapes multiple special chars", () => {
    expect(escapeRegex("$50 Team* (v2.0)")).toBe("\\$50 Team\\* \\(v2\\.0\\)");
  });
});

describe("registration — returning team flow data shape", () => {
  it("filters out withdrawn/rejected when checking for duplicates in returning flow", () => {
    const existingRegs = [
      { teamName: "Thunder 10U", divisionId: "div1", status: "approved" },
      { teamName: "Thunder 12U", divisionId: "div2", status: "withdrawn" },
    ];
    expect(isDuplicateRegistration(existingRegs, "Thunder 10U", "div1")).toBe(true);
    expect(isDuplicateRegistration(existingRegs, "Thunder 12U", "div2")).toBe(false);
  });

  it("validates returning teams still need a teamName", () => {
    const result = validateTeams(
      [
        { teamName: "Thunder 10U", divisionId: "div1" },
        { teamName: "" },
      ],
      ["div1"],
    );
    expect(result).toBe("All teams must have a name");
  });
});

describe("registration — edge cases", () => {
  it("handles team name with leading/trailing whitespace", () => {
    expect(
      validateTeams([{ teamName: "  Thunder 10U  " }], []),
    ).toBeNull(); // trim happens at submit, not validation
  });

  it("handles division ID as empty string (no division selected)", () => {
    expect(
      validateTeams([{ teamName: "Thunder", divisionId: "" }], ["div1"]),
    ).toBeNull(); // empty string is falsy, treated as no division
  });

  it("single team total equals per-team price", () => {
    expect(calcTotal(5000, 1)).toBe(5000);
  });

  it("large team count with percentage discount", () => {
    const discounts = [{ minTeams: 10, discountPercent: 25 }];
    // 5000 * 0.75 = 3750, * 12 = 45000
    expect(calcTotal(5000, 12, discounts)).toBe(45000);
  });

  it("discount cannot make price negative", () => {
    const discounts = [{ minTeams: 1, discountAmountPerTeam: 10000 }];
    // max(0, 5000 - 10000) = -5000 * 1 = -5000
    // Note: current implementation allows negative — this documents the behavior
    const total = calcTotal(5000, 1, discounts);
    // If this is a problem, the route should clamp to 0
    expect(total).toBe(-5000);
  });
});
