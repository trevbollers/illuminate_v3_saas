export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/events — list events with optional filters
export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("q");

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (type && type !== "all") filter.type = type;
  if (search) filter.name = { $regex: search, $options: "i" };

  const events = await tenant.models.Event.find(filter)
    .sort({ startDate: -1 })
    .lean();

  return NextResponse.json(events);
}

// POST /api/events — create a new event
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Generate slug
  let slug = slugify(body.name || "event");
  if (!slug) slug = "event";
  const existing = await tenant.models.Event.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Default tiebreaker rules for 7v7
  const defaultTiebreakers = [
    { priority: 1, rule: "Head-to-head record", description: "Record between tied teams" },
    { priority: 2, rule: "Point differential", description: "Total points scored minus points allowed" },
    { priority: 3, rule: "Points allowed", description: "Fewest points allowed wins" },
    { priority: 4, rule: "Coin flip", description: "Random draw if still tied" },
  ];

  const event = await tenant.models.Event.create({
    name: body.name,
    slug,
    type: body.type || "tournament",
    sport: body.sport || "7v7_football",
    description: body.description || "",
    posterUrl: body.posterUrl || undefined,

    locations: body.locations || [],

    days: body.days || [],
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),

    registrationOpen: new Date(body.registrationOpen),
    registrationClose: new Date(body.registrationClose),
    rosterLockDate: body.rosterLockDate ? new Date(body.rosterLockDate) : undefined,

    divisionIds: [],
    maxTeamsPerDivision: body.maxTeamsPerDivision || undefined,
    estimatedTeamsPerDivision: body.estimatedTeamsPerDivision || undefined,

    pricing: {
      amount: body.pricing?.amount ?? 0,
      earlyBirdAmount: body.pricing?.earlyBirdAmount || undefined,
      earlyBirdDeadline: body.pricing?.earlyBirdDeadline
        ? new Date(body.pricing.earlyBirdDeadline)
        : undefined,
      lateFeeAmount: body.pricing?.lateFeeAmount || undefined,
      lateFeeStartDate: body.pricing?.lateFeeStartDate
        ? new Date(body.pricing.lateFeeStartDate)
        : undefined,
      refundPolicy: body.pricing?.refundPolicy || undefined,
      multiTeamDiscounts: body.pricing?.multiTeamDiscounts || [],
    },

    settings: {
      gameDurationMinutes: body.settings?.gameDurationMinutes ?? 40,
      halfDurationMinutes: body.settings?.halfDurationMinutes ?? 20,
      timeBetweenGamesMinutes: body.settings?.timeBetweenGamesMinutes ?? 10,
      clockType: body.settings?.clockType || "running",
      overtimeRules: body.settings?.overtimeRules || undefined,
      maxRosterSize: body.settings?.maxRosterSize || undefined,
      minRosterSize: body.settings?.minRosterSize || undefined,
      allowMultiTeamPlayers: body.settings?.allowMultiTeamPlayers ?? false,
      requireAgeVerification: body.settings?.requireAgeVerification ?? true,
      requireWaiver: body.settings?.requireWaiver ?? true,
    },

    tiebreakerRules: body.tiebreakerRules || defaultTiebreakers,
    tiebreakerLocked: false,

    status: "draft",
    contactEmail: body.contactEmail || undefined,
    contactPhone: body.contactPhone || undefined,
    rules: body.rules || undefined,
    announcementIds: [],

    createdBy: new Types.ObjectId(tenant.userId),
  });

  return NextResponse.json(event, { status: 201 });
}
