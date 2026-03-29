export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";

// GET /api/public/events — list all published events for this league
export async function GET(
  _req: NextRequest,
): Promise<NextResponse> {
  const ctx = await getPublicLeagueTenant();
  if (!ctx) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const { models, tenant } = ctx;

  const events = await models.Event.find({
    status: { $in: ["published", "registration_open", "registration_closed", "in_progress", "completed"] },
  })
    .sort({ startDate: 1 })
    .select("name slug type sport startDate endDate status locations bannerUrl")
    .lean();

  return NextResponse.json({
    leagueName: tenant.name,
    events,
  });
}
