export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

interface ScheduleSlot {
  dayIndex: number;
  locationName: string;
  field: string;
  timeSlot: string;
  scheduledAt: string;
  homeTeamName: string;
  awayTeamName: string;
  divisionLabel: string;
  divisionId: string;
  round: string;
  gameNumber: number;
}

// POST /api/events/[id]/schedule — AI-powered schedule generation
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

  const event = await tenant.models.Event.findById(params.id).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const divisions = await tenant.models.Division.find({
    eventId: new Types.ObjectId(params.id),
  }).lean();

  if (divisions.length === 0) {
    return NextResponse.json(
      { error: "No divisions configured. Add divisions before generating a schedule." },
      { status: 400 },
    );
  }

  // Collect all fields across all locations
  const allFields: { locationName: string; field: string }[] = [];
  for (const loc of event.locations) {
    for (const f of loc.fields) {
      if (f) allFields.push({ locationName: loc.name, field: f });
    }
  }

  if (allFields.length === 0) {
    return NextResponse.json(
      { error: "No fields/courts configured. Add locations with fields first." },
      { status: 400 },
    );
  }

  // Get registered teams per division, or use estimates
  const registrations = await tenant.models.Registration.find({
    eventId: new Types.ObjectId(params.id),
    status: { $in: ["approved", "pending"] },
  }).lean();

  // Build division info for AI
  const divisionInfo = divisions.map((d: any) => {
    const divRegs = registrations.filter(
      (r: any) => r.divisionId.toString() === d._id.toString(),
    );
    const registeredTeams = divRegs.map((r: any) => ({
      id: r.teamId?.toString() || r._id.toString(),
      name: r.teamName,
      orgId: r.orgTenantId?.toString() || "",
    }));
    const estimatedCount = registeredTeams.length || d.estimatedTeamCount || (event as any).estimatedTeamsPerDivision || 8;

    return {
      id: d._id.toString(),
      label: d.label,
      key: d.key,
      skillLevel: d.skillLevel,
      eventFormat: d.eventFormat || "round_robin",
      bracketType: d.bracketType || "single_elimination",
      minPoolGamesPerTeam: d.minPoolGamesPerTeam ?? 3,
      poolCount: d.poolCount,
      teamsAdvancingPerPool: d.teamsAdvancingPerPool ?? 2,
      pools: d.pools?.map((p: any) => ({ name: p.name, teamCount: p.teamIds?.length || 0 })) || [],
      maxTeams: d.maxTeams,
      registeredTeams,
      estimatedTeamCount: Math.max(estimatedCount, registeredTeams.length),
    };
  });

  // Build the prompt for Claude
  const prompt = buildSchedulePrompt(event as any, divisionInfo, allFields);

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-...") {
    // Fallback: generate a basic schedule without AI
    const schedule = generateBasicSchedule(event as any, divisionInfo, allFields);
    return await saveAndReturnSchedule(tenant, params.id, event as any, schedule);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[schedule] Claude API error:", errBody);
      // Fallback to basic schedule
      const schedule = generateBasicSchedule(event as any, divisionInfo, allFields);
      return await saveAndReturnSchedule(tenant, params.id, event as any, schedule);
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    // Extract JSON from Claude's response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[schedule] Could not parse Claude response, falling back");
      const schedule = generateBasicSchedule(event as any, divisionInfo, allFields);
      return await saveAndReturnSchedule(tenant, params.id, event as any, schedule);
    }

    const schedule: ScheduleSlot[] = JSON.parse(jsonMatch[0]);
    return await saveAndReturnSchedule(tenant, params.id, event as any, schedule);
  } catch (err) {
    console.error("[schedule] AI error, falling back:", err);
    const schedule = generateBasicSchedule(event as any, divisionInfo, allFields);
    return await saveAndReturnSchedule(tenant, params.id, event as any, schedule);
  }
}

async function saveAndReturnSchedule(
  tenant: any,
  eventId: string,
  event: any,
  schedule: ScheduleSlot[],
): Promise<NextResponse> {
  // Delete existing scheduled games
  await tenant.models.Game.deleteMany({
    eventId: new Types.ObjectId(eventId),
    status: "scheduled",
  });

  // Create games from schedule
  const games = schedule.map((slot) => ({
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(slot.divisionId),
    homeTeamName: slot.homeTeamName,
    awayTeamName: slot.awayTeamName,
    scheduledAt: new Date(slot.scheduledAt),
    dayIndex: slot.dayIndex,
    locationName: slot.locationName,
    field: slot.field,
    timeSlot: slot.timeSlot,
    sport: event.sport,
    round: slot.round,
    gameNumber: slot.gameNumber,
    status: "scheduled",
  }));

  if (games.length > 0) {
    await tenant.models.Game.insertMany(games);
  }

  return NextResponse.json({
    gamesCreated: games.length,
    schedule,
  });
}

function buildSchedulePrompt(
  event: any,
  divisions: any[],
  fields: { locationName: string; field: string }[],
): string {
  const days = event.days.map((d: any, i: number) => ({
    dayIndex: i,
    date: d.date,
    startTime: d.startTime,
    endTime: d.endTime,
    label: d.label || `Day ${i + 1}`,
  }));

  return `You are a sports tournament scheduling AI. Generate a game schedule as a JSON array.

EVENT DETAILS:
- Name: ${event.name}
- Sport: ${event.sport}
- Game Duration: ${event.settings.gameDurationMinutes} minutes
- Break Between Games: ${event.settings.timeBetweenGamesMinutes} minutes

FIELDS AVAILABLE:
${fields.map((f) => `- "${f.field}" at "${f.locationName}"`).join("\n")}

EVENT DAYS:
${days.map((d: any) => `- Day ${d.dayIndex}: ${d.date} (${d.startTime} - ${d.endTime}) — ${d.label}`).join("\n")}

DIVISIONS (each division has its OWN event format):
${divisions
  .map(
    (d) => {
      let formatDesc = "";
      if (d.eventFormat === "round_robin") {
        formatDesc = `Format: ROUND ROBIN ONLY — all pool play, no bracket. Min ${d.minPoolGamesPerTeam} games per team.`;
      } else if (d.eventFormat === "pool_play_to_bracket") {
        formatDesc = `Format: POOL PLAY then BRACKET — pool play first (min ${d.minPoolGamesPerTeam} games/team), top ${d.teamsAdvancingPerPool} teams per pool advance to ${d.bracketType} bracket.`;
      } else if (d.eventFormat === "bracket_only") {
        formatDesc = `Format: BRACKET ONLY — straight to ${d.bracketType} bracket, no pool play.`;
      }
      const teamInfo = d.registeredTeams.length > 0
        ? `\n  Registered: ${d.registeredTeams.map((t: any) => `${t.name}${t.orgId ? ` [org:${t.orgId}]` : ""}`).join(", ")}`
        : `\n  Using placeholder team names (Team 1, Team 2, etc.)`;
      return `- ${d.label} (ID: ${d.id}, ${d.estimatedTeamCount} teams)\n  ${formatDesc}${teamInfo}`;
    },
  )
  .join("\n")}

RULES:
1. Each game takes ${event.settings.gameDurationMinutes} minutes with ${event.settings.timeBetweenGamesMinutes} minutes between games
2. Games must fit within each day's start/end times
3. A field can only host one game at a time
4. IMPORTANT: Each division has its own format. Respect each division's eventFormat independently:
   - "round_robin": Generate round-robin matchups. Every team plays every other team (or enough games so each team plays at least minPoolGamesPerTeam games). With uneven teams, some teams play one extra game.
   - "pool_play_to_bracket": Generate pool play round-robin games first, then bracket games for advancing teams (use "TBD" for bracket slots since pool results aren't known yet). Set round to "Pool Play" for pool games and "Quarterfinal"/"Semifinal"/"Final" etc. for bracket games.
   - "bracket_only": Generate single/double elimination bracket games with round labels. First round uses team names, later rounds use "TBD".
5. Spread divisions across fields fairly — don't stack all of one division on one field
6. Use registered team names if available, otherwise use "${event.sport === "7v7_football" ? "Team" : "Squad"} 1", "${event.sport === "7v7_football" ? "Team" : "Squad"} 2", etc. prefixed with division label
7. Try to spread each team's games out — avoid back-to-back games for the same team
8. Schedule pool play games first on earlier time slots, then bracket games later
9. IMPORTANT: Avoid scheduling teams from the same organization against each other in early rounds. Teams from the same org (same orgId) should ideally not meet until later in the bracket or later pool rounds. This prevents local/same-area matchups early in the event

Return ONLY a JSON array of objects with this exact structure (no markdown, no explanation):
[
  {
    "dayIndex": 0,
    "locationName": "Field location name",
    "field": "Field 1",
    "timeSlot": "08:00",
    "scheduledAt": "2026-04-01T08:00:00.000Z",
    "homeTeamName": "Team A",
    "awayTeamName": "Team B",
    "divisionLabel": "U12 D1",
    "divisionId": "division_id_here",
    "round": "Pool Play",
    "gameNumber": 1
  }
]`;
}

// Fallback: format-aware schedule without AI
function generateBasicSchedule(
  event: any,
  divisions: any[],
  fields: { locationName: string; field: string }[],
): ScheduleSlot[] {
  const schedule: ScheduleSlot[] = [];
  const gameDuration = event.settings.gameDurationMinutes || 40;
  const breakTime = event.settings.timeBetweenGamesMinutes || 10;
  const slotDuration = gameDuration + breakTime;
  let gameNumber = 1;

  // Build all matchups across all divisions, respecting each division's format
  interface Matchup {
    home: string;
    away: string;
    divisionId: string;
    divisionLabel: string;
    round: string;
    phase: "pool" | "bracket"; // pool games scheduled first
  }

  const poolMatchups: Matchup[] = [];
  const bracketMatchups: Matchup[] = [];

  for (const div of divisions) {
    const teamCount = div.estimatedTeamCount;
    const teams: { name: string; orgId: string }[] = div.registeredTeams.length > 0
      ? div.registeredTeams.map((t: any) => ({ name: t.name, orgId: t.orgId || "" }))
      : Array.from({ length: teamCount }, (_, i) => ({ name: `${div.label} Team ${i + 1}`, orgId: "" }));

    const teamNames = teams.map((t) => t.name);
    const orgMap = new Map<string, string>();
    for (const t of teams) orgMap.set(t.name, t.orgId);

    const format = div.eventFormat || "round_robin";

    if (format === "round_robin" || format === "pool_play_to_bracket") {
      // Generate round-robin pool play games
      const minGames = div.minPoolGamesPerTeam || 3;
      const rrMatchups = generateRoundRobinMatchups(teamNames, minGames);

      // Sort: same-org matchups pushed later
      rrMatchups.sort((a, b) => {
        const aOrgHome = orgMap.get(a.home) || "";
        const aOrgAway = orgMap.get(a.away) || "";
        const bOrgHome = orgMap.get(b.home) || "";
        const bOrgAway = orgMap.get(b.away) || "";
        const aSameOrg = aOrgHome && aOrgHome === aOrgAway ? 1 : 0;
        const bSameOrg = bOrgHome && bOrgHome === bOrgAway ? 1 : 0;
        return aSameOrg - bSameOrg;
      });

      for (const m of rrMatchups) {
        poolMatchups.push({
          home: m.home,
          away: m.away,
          divisionId: div.id,
          divisionLabel: div.label,
          round: "Pool Play",
          phase: "pool",
        });
      }

      // For pool_play_to_bracket, also generate bracket placeholder games
      if (format === "pool_play_to_bracket") {
        const advancingCount = (div.teamsAdvancingPerPool || 2) * (div.poolCount || 1);
        const bracketSize = Math.max(advancingCount, 4); // at least 4 for a bracket
        const bracketGames = generateBracketMatchups(div, bracketSize);
        bracketMatchups.push(...bracketGames);
      }
    } else if (format === "bracket_only") {
      // Straight to bracket
      const bracketGames = generateBracketMatchups(div, teams.length, teams);
      bracketMatchups.push(...bracketGames);
    }
  }

  // Combine: pool games first, then bracket games
  const allMatchups = [...poolMatchups, ...bracketMatchups];

  // Assign matchups to field/time slots across days
  let matchupIdx = 0;

  for (let dayIndex = 0; dayIndex < event.days.length; dayIndex++) {
    const day = event.days[dayIndex];
    if (!day) continue;

    const dayDate = new Date(day.date);
    const [startH, startM] = (day.startTime || "08:00").split(":").map(Number);
    const [endH, endM] = (day.endTime || "18:00").split(":").map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    // Generate time slots
    const timeSlots: string[] = [];
    for (let t = startMinutes; t + gameDuration <= endMinutes; t += slotDuration) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      timeSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }

    // Fill time slots across fields
    for (let slotIdx = 0; slotIdx < timeSlots.length && matchupIdx < allMatchups.length; slotIdx++) {
      for (let fieldIdx = 0; fieldIdx < fields.length && matchupIdx < allMatchups.length; fieldIdx++) {
        const matchup = allMatchups[matchupIdx]!;
        const fieldInfo = fields[fieldIdx]!;
        const ts = timeSlots[slotIdx]!;
        const [tsH, tsM] = ts.split(":").map(Number);

        const scheduledAt = new Date(dayDate);
        scheduledAt.setHours(tsH || 0, tsM || 0, 0, 0);

        schedule.push({
          dayIndex,
          locationName: fieldInfo.locationName,
          field: fieldInfo.field,
          timeSlot: ts,
          scheduledAt: scheduledAt.toISOString(),
          homeTeamName: matchup.home,
          awayTeamName: matchup.away,
          divisionLabel: matchup.divisionLabel,
          divisionId: matchup.divisionId,
          round: matchup.round,
          gameNumber: gameNumber++,
        });

        matchupIdx++;
      }
    }
  }

  return schedule;
}

// Generate round-robin matchups ensuring each team plays at least minGames
function generateRoundRobinMatchups(
  teams: string[],
  minGames: number,
): { home: string; away: string }[] {
  const matchups: { home: string; away: string }[] = [];

  // Full round-robin first
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({ home: teams[i]!, away: teams[j]! });
    }
  }

  // Check if every team has at least minGames
  // In a full round-robin with N teams, each plays N-1 games
  // If N-1 >= minGames, we're good. Otherwise, add extra games for teams below the minimum.
  const gamesPerTeam = new Map<string, number>();
  for (const t of teams) gamesPerTeam.set(t, 0);
  for (const m of matchups) {
    gamesPerTeam.set(m.home, (gamesPerTeam.get(m.home) || 0) + 1);
    gamesPerTeam.set(m.away, (gamesPerTeam.get(m.away) || 0) + 1);
  }

  // Add extra games for teams that haven't reached minGames (uneven team handling)
  const teamsBelow = teams.filter((t) => (gamesPerTeam.get(t) || 0) < minGames);
  for (const team of teamsBelow) {
    let currentGames = gamesPerTeam.get(team) || 0;
    // Find opponents to play extra games against (pick teams with fewest games first)
    const opponents = teams
      .filter((t) => t !== team)
      .sort((a, b) => (gamesPerTeam.get(a) || 0) - (gamesPerTeam.get(b) || 0));

    for (const opp of opponents) {
      if (currentGames >= minGames) break;
      matchups.push({ home: team, away: opp });
      currentGames++;
      gamesPerTeam.set(team, currentGames);
      gamesPerTeam.set(opp, (gamesPerTeam.get(opp) || 0) + 1);
    }
  }

  return matchups;
}

// Separate teams from the same org onto opposite sides of the bracket
function seedWithOrgSeparation(
  teams: { name: string; orgId: string }[],
  bracketSize: number,
): string[] {
  const seeded: string[] = new Array(bracketSize).fill("BYE");

  if (teams.length === 0) return seeded;

  // Group teams by org
  const byOrg = new Map<string, { name: string; orgId: string }[]>();
  const noOrg: { name: string; orgId: string }[] = [];
  for (const t of teams) {
    if (t.orgId) {
      const list = byOrg.get(t.orgId) || [];
      list.push(t);
      byOrg.set(t.orgId, list);
    } else {
      noOrg.push(t);
    }
  }

  // Sort orgs by size (largest first) so we place the biggest conflicts first
  const orgGroups = [...byOrg.values()].sort((a, b) => b.length - a.length);

  // Bracket halves: top half = slots 0..bracketSize/2-1, bottom = bracketSize/2..bracketSize-1
  // For each org group, distribute teams across halves as evenly as possible
  const topSlots: number[] = [];
  const bottomSlots: number[] = [];
  const half = bracketSize / 2;
  for (let i = 0; i < half; i++) topSlots.push(i);
  for (let i = half; i < bracketSize; i++) bottomSlots.push(i);

  let topIdx = 0;
  let bottomIdx = 0;
  const placed = new Set<number>();

  for (const orgTeams of orgGroups) {
    let useTop = true;
    for (const t of orgTeams) {
      // Alternate placing same-org teams in top/bottom half
      if (useTop) {
        while (topIdx < topSlots.length && placed.has(topSlots[topIdx]!)) topIdx++;
        if (topIdx < topSlots.length) {
          seeded[topSlots[topIdx]!] = t.name;
          placed.add(topSlots[topIdx]!);
          topIdx++;
        }
      } else {
        while (bottomIdx < bottomSlots.length && placed.has(bottomSlots[bottomIdx]!)) bottomIdx++;
        if (bottomIdx < bottomSlots.length) {
          seeded[bottomSlots[bottomIdx]!] = t.name;
          placed.add(bottomSlots[bottomIdx]!);
          bottomIdx++;
        }
      }
      useTop = !useTop;
    }
  }

  // Place teams with no org in remaining slots
  for (const t of noOrg) {
    // Fill top first, then bottom
    while (topIdx < topSlots.length && placed.has(topSlots[topIdx]!)) topIdx++;
    if (topIdx < topSlots.length) {
      seeded[topSlots[topIdx]!] = t.name;
      placed.add(topSlots[topIdx]!);
      topIdx++;
    } else {
      while (bottomIdx < bottomSlots.length && placed.has(bottomSlots[bottomIdx]!)) bottomIdx++;
      if (bottomIdx < bottomSlots.length) {
        seeded[bottomSlots[bottomIdx]!] = t.name;
        placed.add(bottomSlots[bottomIdx]!);
        bottomIdx++;
      }
    }
  }

  return seeded;
}

// Generate bracket matchups (single/double elimination)
function generateBracketMatchups(
  div: any,
  teamCount: number,
  teams?: { name: string; orgId: string }[],
): { home: string; away: string; divisionId: string; divisionLabel: string; round: string; phase: "bracket" }[] {
  const matchups: { home: string; away: string; divisionId: string; divisionLabel: string; round: string; phase: "bracket" }[] = [];

  // Find next power of 2 for bracket size
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(teamCount, 2))));
  const totalRounds = Math.log2(bracketSize);

  const roundNames: Record<number, string> = {};
  if (totalRounds >= 4) roundNames[1] = "Round of " + bracketSize;
  if (totalRounds >= 3) roundNames[Math.max(1, totalRounds - 2)] = "Quarterfinal";
  roundNames[Math.max(1, totalRounds - 1)] = "Semifinal";
  roundNames[totalRounds] = "Final";
  // Fill in early rounds
  for (let r = 1; r <= totalRounds; r++) {
    if (!roundNames[r]) roundNames[r] = `Round ${r}`;
  }

  // Seed teams with org separation for bracket_only format
  const seededNames = teams && teams.length > 0
    ? seedWithOrgSeparation(teams, bracketSize)
    : new Array(bracketSize).fill("TBD");

  // First round: pair teams (or use TBD for pool_play_to_bracket advancing)
  let gamesInRound = bracketSize / 2;
  for (let round = 1; round <= totalRounds; round++) {
    const roundName = roundNames[round] || `Round ${round}`;
    for (let g = 0; g < gamesInRound; g++) {
      let home = "TBD";
      let away = "TBD";

      if (round === 1) {
        home = seededNames[g * 2] || "TBD";
        away = seededNames[g * 2 + 1] || "TBD";
        // Handle byes
        if (home !== "TBD" && away === "BYE") away = "BYE";
      }

      matchups.push({
        home,
        away,
        divisionId: div.id,
        divisionLabel: div.label,
        round: roundName,
        phase: "bracket",
      });
    }
    gamesInRound = Math.floor(gamesInRound / 2);
  }

  return matchups;
}
