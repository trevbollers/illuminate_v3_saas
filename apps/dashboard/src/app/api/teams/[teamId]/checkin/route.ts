export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import {
  connectPlatformDB,
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
  registerLeagueModels,
  getLeagueModels,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/teams/[teamId]/checkin — get check-in status for this team across league events
 *
 * Returns: for each event this team is registered in, the check-in status of each roster player.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await params;
  if (!Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  // Get team name + roster from org DB
  const orgConn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(orgConn);
  const orgModels = getOrgModels(orgConn);

  const team = await orgModels.Team.findById(teamId).select("name").lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamName = (team as any).name;

  const roster = await orgModels.Roster.find({ teamId: new Types.ObjectId(teamId), status: "active" })
    .select("playerId playerName jerseyNumber")
    .lean();

  // Get org tenant ID
  await connectPlatformDB();
  const orgTenant = await Tenant.findOne({ slug: tenantSlug }).select("_id").lean();
  if (!orgTenant) return NextResponse.json({ events: [] });
  const orgTenantId = (orgTenant as any)._id;

  // Find league events where this team is registered
  const leagueTenants = await Tenant.find({ tenantType: "league", status: "active" })
    .select("slug name")
    .lean();

  const eventCheckins: any[] = [];

  for (const league of leagueTenants as any[]) {
    try {
      const lConn = await connectTenantDB(league.slug, "league");
      registerLeagueModels(lConn);
      const lModels = getLeagueModels(lConn);

      // Find registrations for this team
      const regs = await lModels.Registration.find({
        orgTenantId: new Types.ObjectId(orgTenantId.toString()),
        teamName,
        status: { $in: ["approved", "pending"] },
      })
        .select("eventId divisionId teamName")
        .lean();

      if (regs.length === 0) continue;

      for (const reg of regs as any[]) {
        const event = await lModels.Event.findById(reg.eventId)
          .select("name status startDate days")
          .lean();
        if (!event) continue;

        const ev = event as any;
        // Only show active/upcoming events
        if (["completed", "canceled", "draft"].includes(ev.status)) continue;

        // Get division label
        let divisionLabel = "";
        if (reg.divisionId) {
          const div = await lModels.Division.findById(reg.divisionId).select("label").lean();
          if (div) divisionLabel = (div as any).label;
        }

        // Get check-ins for this registration
        const checkIns = await lModels.CheckIn.find({
          eventId: reg.eventId,
          registrationId: reg._id,
          status: "checked_in",
        })
          .select("playerId playerName scannedAt dayIndex")
          .lean();

        const checkedInPlayerIds = new Set(
          (checkIns as any[]).map((ci) => ci.playerId.toString()),
        );

        const rosterStatus = (roster as any[]).map((r) => ({
          playerId: r.playerId.toString(),
          playerName: r.playerName,
          jerseyNumber: r.jerseyNumber,
          checkedIn: checkedInPlayerIds.has(r.playerId.toString()),
          checkedInAt: (checkIns as any[]).find(
            (ci) => ci.playerId.toString() === r.playerId.toString(),
          )?.scannedAt,
        }));

        eventCheckins.push({
          eventId: reg.eventId.toString(),
          eventName: ev.name,
          eventStatus: ev.status,
          startDate: ev.startDate,
          leagueName: league.name,
          divisionLabel,
          registrationId: reg._id.toString(),
          totalRoster: roster.length,
          checkedInCount: checkedInPlayerIds.size,
          allCheckedIn: checkedInPlayerIds.size >= roster.length,
          players: rosterStatus,
        });
      }
    } catch {}
  }

  return NextResponse.json({ teamName, events: eventCheckins });
}
