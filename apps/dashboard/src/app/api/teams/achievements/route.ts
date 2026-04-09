export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  connectPlatformDB,
  connectTenantDB,
  Tenant,
  getLeagueModels,
  registerLeagueModels,
} from "@goparticipate/db";
import { Types } from "mongoose";

/**
 * GET /api/teams/achievements — fetch champion/finalist badges for this org's teams
 *
 * Queries all league DBs where this org has registrations to find
 * champion and finalist flags.
 */
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");

  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();

  // Get this org's tenant ID
  const orgTenant = await Tenant.findOne({ slug: tenantSlug, tenantType: "organization" })
    .select("_id")
    .lean();

  if (!orgTenant) {
    return NextResponse.json([]);
  }

  const orgTenantId = (orgTenant as any)._id;

  // Find all league tenants (to query their registrations)
  const leagueTenants = await Tenant.find({ tenantType: "league", status: "active" })
    .select("slug name")
    .lean();

  const achievements: {
    teamName: string;
    eventName: string;
    division: string;
    bracketTier?: string;
    type: "champion" | "finalist";
  }[] = [];

  // Query each league DB for this org's champion/finalist registrations
  for (const league of leagueTenants as any[]) {
    try {
      const conn = await connectTenantDB(league.slug, "league");
      registerLeagueModels(conn);
      const models = getLeagueModels(conn);

      const regs = await models.Registration.find({
        orgTenantId: new Types.ObjectId(orgTenantId.toString()),
        $or: [{ champion: true }, { finalist: true }],
      })
        .select("teamName eventId championDivision bracketTier champion finalist")
        .lean();

      if (regs.length === 0) continue;

      // Get event names
      const eventIds = [...new Set(regs.map((r: any) => r.eventId.toString()))];
      const events = await models.Event.find({
        _id: { $in: eventIds.map((id) => new Types.ObjectId(id)) },
      })
        .select("name")
        .lean();
      const eventMap = new Map(events.map((e: any) => [e._id.toString(), e.name]));

      for (const reg of regs as any[]) {
        if (reg.champion) {
          achievements.push({
            teamName: reg.teamName,
            eventName: eventMap.get(reg.eventId.toString()) || league.name,
            division: reg.championDivision || "",
            bracketTier: reg.bracketTier,
            type: "champion",
          });
        }
        if (reg.finalist) {
          achievements.push({
            teamName: reg.teamName,
            eventName: eventMap.get(reg.eventId.toString()) || league.name,
            division: reg.championDivision || "",
            bracketTier: reg.bracketTier,
            type: "finalist",
          });
        }
      }
    } catch (err) {
      console.error(`[achievements] failed to query league ${league.slug}:`, err);
    }
  }

  return NextResponse.json(achievements);
}
