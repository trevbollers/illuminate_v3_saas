export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";

// GET /api/public/events/[slug]/teams — public team listing by division
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
    status: {
      $in: [
        "published",
        "registration_open",
        "registration_closed",
        "in_progress",
        "completed",
      ],
    },
  })
    .select("name slug divisionIds")
    .lean();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const divisions = await models.Division.find({
    _id: { $in: (event as any).divisionIds },
  })
    .select("key label pools")
    .sort({ sortOrder: 1 })
    .lean();

  // Get approved registrations — these are the teams in the event
  const registrations = await models.Registration.find({
    eventId: (event as any)._id,
    status: { $in: ["approved", "pending"] },
  })
    .select("divisionId teamName teamId orgTenantId status roster")
    .sort({ teamName: 1 })
    .lean();

  // Build team list per division, including pool assignment if applicable
  const teams = (registrations as any[]).map((r) => {
    // Find which pool this team belongs to (if any)
    let poolName: string | undefined;
    for (const div of divisions as any[]) {
      if (div._id.toString() === r.divisionId.toString() && div.pools?.length) {
        for (const pool of div.pools) {
          if (pool.teamIds?.some((tid: any) => tid.toString() === r.teamId?.toString())) {
            poolName = pool.name;
            break;
          }
        }
      }
    }

    return {
      _id: r._id,
      divisionId: r.divisionId,
      teamName: r.teamName,
      teamId: r.teamId,
      status: r.status,
      rosterCount: r.roster?.length || 0,
      pool: poolName,
    };
  });

  return NextResponse.json({
    event,
    divisions,
    teams,
    leagueName: ctx.tenant.name,
  });
}
