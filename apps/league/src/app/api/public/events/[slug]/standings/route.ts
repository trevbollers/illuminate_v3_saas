export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";

// GET /api/public/events/[slug]/standings — public standings
export async function GET(
  _req: NextRequest,
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
    .select("name slug type sport startDate endDate divisionIds status")
    .lean();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const divisions = await models.Division.find({
    _id: { $in: (event as any).divisionIds },
  })
    .select("key label")
    .lean();

  const standings = await models.Standing.find({ eventId: (event as any)._id })
    .sort({ divisionId: 1, rank: 1, wins: -1, pointDifferential: -1 })
    .lean();

  return NextResponse.json({
    event,
    divisions,
    standings,
    leagueName: ctx.tenant.name,
  });
}
