export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectPlatformDB, Tenant, connectTenantDB, getLeagueModels } from "@goparticipate/db";
import { auth } from "@goparticipate/auth/edge";

// GET /api/events/league — browse available league events for this org
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();

  // Get this org's tenant doc to find affiliated leagues
  const orgTenant = await Tenant.findOne({ slug: session.user.tenantSlug }).lean();
  if (!orgTenant) {
    return NextResponse.json({ error: "Org tenant not found" }, { status: 404 });
  }

  const leagueIds = (orgTenant as any).orgInfo?.leagueIds || [];

  // Also find all league tenants in the same sport (for discovery)
  const sport = (orgTenant as any).sport;
  const allLeagues = await Tenant.find({
    tenantType: "league",
    sport,
    status: "active",
  })
    .select("_id name slug sport")
    .lean();

  // Fetch open events from each league
  const allEvents: any[] = [];

  for (const league of allLeagues) {
    try {
      const conn = await connectTenantDB((league as any).slug, "league");
      const models = getLeagueModels(conn);

      const events = await models.Event.find({
        status: { $in: ["published", "registration_open"] },
      })
        .sort({ startDate: 1 })
        .lean();

      // Fetch divisions for each event
      for (const event of events) {
        const divisions = await models.Division.find({
          eventId: (event as any)._id,
        })
          .select("label key eventFormat estimatedTeamCount maxTeams bracketType skillLevel")
          .lean();

        // Get registration count per division
        const registrations = await models.Registration.find({
          eventId: (event as any)._id,
          status: { $nin: ["rejected", "withdrawn"] },
        })
          .select("divisionId orgTenantId teamId teamName status roster")
          .lean();

        // Check if this org already registered teams
        const orgRegistrations = registrations.filter(
          (r: any) => r.orgTenantId?.toString() === (orgTenant as any)._id.toString(),
        );

        allEvents.push({
          ...event,
          _leagueId: (league as any)._id.toString(),
          _leagueName: (league as any).name,
          _leagueSlug: (league as any).slug,
          _isAffiliated: leagueIds.some(
            (lid: any) => lid.toString() === (league as any)._id.toString(),
          ),
          _divisions: divisions.map((d: any) => {
            const divRegs = registrations.filter(
              (r: any) => r.divisionId?.toString() === d._id.toString(),
            );
            return {
              ...d,
              _registeredCount: divRegs.length,
              _spotsRemaining: d.maxTeams ? d.maxTeams - divRegs.length : null,
            };
          }),
          _orgRegistrations: orgRegistrations.map((r: any) => ({
            _id: r._id,
            teamId: r.teamId,
            teamName: r.teamName,
            divisionId: r.divisionId,
            status: r.status,
            roster: r.roster || [],
          })),
        });
      }
    } catch (err) {
      console.error(`[events/league] Failed to fetch events from league ${(league as any).slug}:`, err);
    }
  }

  return NextResponse.json(allEvents);
}
