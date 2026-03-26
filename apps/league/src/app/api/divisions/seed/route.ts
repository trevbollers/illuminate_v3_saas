export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Sport } from "@goparticipate/db";
import { getLeagueTenant } from "@/lib/tenant-db";

// POST /api/divisions/seed — bulk-create league-wide divisions from sport templates
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sportId, selectedTemplates, skillLevels } = body;

  // Fetch sport from platform DB
  await connectPlatformDB();
  const sport = await Sport.findOne({ sportId }).lean();
  if (!sport) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  // Filter to selected templates (or use all)
  const templates = selectedTemplates?.length
    ? sport.divisionTemplates.filter((t: any) => selectedTemplates.includes(t.key))
    : sport.divisionTemplates;

  if (templates.length === 0) {
    return NextResponse.json({ error: "No division templates selected" }, { status: 400 });
  }

  // Check existing league-wide divisions to avoid duplicates
  const existing = await tenant.models.Division.find({ eventId: { $exists: false } }).lean();
  const existingKeys = new Set(existing.map((d: any) => d.key));

  const levels = skillLevels?.length ? skillLevels : ["open"];
  const divisionsToCreate: any[] = [];
  let sortOrder = existing.length;

  for (const tmpl of templates) {
    for (const level of levels) {
      const suffix = level !== "open" ? `_${level.toLowerCase()}` : "";
      const key = `${tmpl.key}${suffix}`;
      const labelSuffix = level !== "open" ? ` ${level}` : "";
      const label = `${tmpl.label}${labelSuffix}`;

      if (existingKeys.has(key)) continue;

      divisionsToCreate.push({
        // No eventId — league-wide template
        key,
        label,
        sport: sportId,
        minAge: tmpl.minAge,
        maxAge: tmpl.maxAge,
        gradeBasedEligibility: false,
        skillLevel: level !== "open" ? level : undefined,
        skillLevelLabel: level !== "open"
          ? (level === "D1" ? "Competitive" : level === "D2" ? "Intermediate" : "Recreational")
          : undefined,
        eventFormat: "round_robin",
        minPoolGamesPerTeam: 3,
        teamsAdvancingPerPool: 2,
        bracketType: "single_elimination",
        isActive: true,
        sortOrder: sortOrder++,
      });
    }
  }

  if (divisionsToCreate.length === 0) {
    return NextResponse.json({ error: "All selected divisions already exist" }, { status: 400 });
  }

  const created = await tenant.models.Division.insertMany(divisionsToCreate);

  return NextResponse.json({ created: created.length, divisions: created }, { status: 201 });
}
