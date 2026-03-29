export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";

// GET /api/public/events/[slug]/schedule — public game schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const ctx = await getPublicLeagueTenant();
  if (!ctx) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const { models } = ctx;
  const event = await models.Event.findOne({
    slug,
    status: { $in: ["published", "registration_open", "registration_closed", "in_progress", "completed"] },
  })
    .select("name slug type sport startDate endDate days locations divisionIds status settings")
    .lean();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const divisions = await models.Division.find({
    _id: { $in: (event as any).divisionIds },
  })
    .select("key label")
    .lean();

  // Optional day filter
  const url = new URL(req.url);
  const dayIndex = url.searchParams.get("day");
  const divisionId = url.searchParams.get("division");

  const gameFilter: any = { eventId: (event as any)._id };
  if (dayIndex !== null) gameFilter.dayIndex = parseInt(dayIndex, 10);
  if (divisionId) gameFilter.divisionId = divisionId;

  const games = await models.Game.find(gameFilter)
    .sort({ dayIndex: 1, scheduledAt: 1, field: 1 })
    .select(
      "homeTeamName awayTeamName homeScore awayScore scheduledAt dayIndex " +
      "locationName field timeSlot round gameNumber status divisionId",
    )
    .lean();

  return NextResponse.json({
    event,
    divisions,
    games,
    leagueName: ctx.tenant.name,
  });
}
