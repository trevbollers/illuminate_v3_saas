export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant, connectTenantDB, getLeagueModels, getOrgModels } from "@goparticipate/db";

/**
 * GET /api/public/programs — aggregate all public programs across all tenants.
 *
 * Returns: org programs + league events, unified into one list.
 * Query params: ?sport=basketball&type=tryout
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const sportFilter = url.searchParams.get("sport");
  const typeFilter = url.searchParams.get("type");

  await connectPlatformDB();
  const tenants = await Tenant.find({ status: "active" })
    .select("name slug tenantType sport logoUrl")
    .lean();

  const allPrograms: any[] = [];

  for (const tenant of tenants as any[]) {
    try {
      if (tenant.tenantType === "organization") {
        const conn = await connectTenantDB(tenant.slug, "organization");
        const { Program } = getOrgModels(conn);

        const filter: any = {
          isPublic: true,
          isActive: true,
          status: { $in: ["registration_open", "registration_closed", "in_progress", "completed"] },
        };
        if (sportFilter) filter.sport = sportFilter;
        if (typeFilter) filter.programType = typeFilter;

        const programs = await Program.find(filter)
          .sort({ startDate: 1 })
          .select("name slug programType sport startDate endDate fee status location city state imageUrl ageGroups capacity tags")
          .lean();

        for (const p of programs as any[]) {
          allPrograms.push({
            ...p,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            tenantType: "organization",
            tenantLogoUrl: tenant.logoUrl,
          });
        }
      } else if (tenant.tenantType === "league") {
        const conn = await connectTenantDB(tenant.slug, "league");
        const models = getLeagueModels(conn);

        const eventFilter: any = {
          status: { $in: ["published", "registration_open", "registration_closed", "in_progress", "completed"] },
        };
        if (sportFilter) eventFilter.sport = sportFilter;

        const events = await models.Event.find(eventFilter)
          .sort({ startDate: 1 })
          .select("name slug type sport startDate endDate status locations bannerUrl")
          .lean();

        for (const e of events as any[]) {
          // Skip if type filter is set and doesn't match
          if (typeFilter && typeFilter !== "tournament" && typeFilter !== "league_season") continue;

          allPrograms.push({
            _id: e._id,
            name: e.name,
            slug: e.slug,
            programType: e.type === "league" ? "league_season" : "tournament",
            sport: e.sport,
            startDate: e.startDate,
            endDate: e.endDate,
            fee: 0,
            status: e.status,
            location: e.locations?.[0]?.name,
            city: e.locations?.[0]?.city,
            state: e.locations?.[0]?.state,
            imageUrl: e.bannerUrl,
            ageGroups: [],
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            tenantType: "league",
            tenantLogoUrl: tenant.logoUrl,
          });
        }
      }
    } catch (err) {
      console.error(`[programs:aggregate] Error loading ${tenant.slug}:`, err);
    }
  }

  // Sort by startDate
  allPrograms.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return NextResponse.json({ programs: allPrograms });
}
