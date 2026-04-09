export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import {
  connectPlatformDB,
  connectTenantDB,
  registerLeagueModels,
  getLeagueModels,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/teams/[teamId]/events — get event history for this team
 *
 * Queries all league DBs for registrations matching this org's team name.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  if (!Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  // Get team name from org DB
  const orgConn = await connectTenantDB(tenantSlug, "organization");
  const { Team } = await import("@goparticipate/db").then((m) => {
    m.registerOrgModels(orgConn);
    return m.getOrgModels(orgConn);
  });

  const team = await Team.findById(teamId).select("name").lean();
  if (!team) {
    return NextResponse.json([]);
  }
  const teamName = (team as any).name;

  // Get org tenant ID
  await connectPlatformDB();
  const orgTenant = await Tenant.findOne({ slug: tenantSlug }).select("_id").lean();
  if (!orgTenant) return NextResponse.json([]);
  const orgTenantId = (orgTenant as any)._id;

  // Query all league DBs for registrations
  const leagueTenants = await Tenant.find({ tenantType: "league", status: "active" })
    .select("slug name")
    .lean();

  const events: {
    eventName: string;
    leagueName: string;
    division: string;
    status: string;
    startDate: string;
    champion?: boolean;
    finalist?: boolean;
  }[] = [];

  for (const league of leagueTenants as any[]) {
    try {
      const conn = await connectTenantDB(league.slug, "league");
      registerLeagueModels(conn);
      const models = getLeagueModels(conn);

      const regs = await models.Registration.find({
        orgTenantId: new Types.ObjectId(orgTenantId.toString()),
        teamName,
      })
        .select("eventId divisionId status champion finalist championDivision")
        .lean();

      if (regs.length === 0) continue;

      // Get events and divisions
      const eventIds = [...new Set((regs as any[]).map((r) => r.eventId.toString()))];
      const divIds = [...new Set((regs as any[]).filter((r: any) => r.divisionId).map((r: any) => r.divisionId.toString()))];

      const [evts, divs] = await Promise.all([
        models.Event.find({ _id: { $in: eventIds.map((id) => new Types.ObjectId(id)) } })
          .select("name status startDate")
          .lean(),
        divIds.length > 0
          ? models.Division.find({ _id: { $in: divIds.map((id) => new Types.ObjectId(id)) } })
              .select("label")
              .lean()
          : Promise.resolve([]),
      ]);

      const eventMap = new Map((evts as any[]).map((e) => [e._id.toString(), e]));
      const divMap = new Map((divs as any[]).map((d) => [d._id.toString(), d.label]));

      for (const reg of regs as any[]) {
        const evt = eventMap.get(reg.eventId.toString());
        if (!evt) continue;
        events.push({
          eventName: evt.name,
          leagueName: league.name,
          division: reg.divisionId ? (divMap.get(reg.divisionId.toString()) || reg.championDivision || "") : "",
          status: evt.status,
          startDate: evt.startDate,
          champion: reg.champion,
          finalist: reg.finalist,
        });
      }
    } catch {}
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return NextResponse.json(events);
}
