export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  connectPlatformDB,
  connectTenantDB,
  registerLeagueModels,
  getLeagueModels,
  Tenant,
} from "@goparticipate/db";

// GET /api/announcements — list league announcements visible to this org admin
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = role === "org_owner" || role === "org_admin";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectPlatformDB();

  const orgTenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  if (!orgTenant) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const sport = (orgTenant as any).sport;
  const leagues = await Tenant.find({
    tenantType: "league",
    sport,
    status: "active",
  })
    .select("_id name slug")
    .lean();

  const allAnnouncements: any[] = [];

  for (const league of leagues) {
    try {
      const conn = await connectTenantDB((league as any).slug, "league");
      registerLeagueModels(conn);
      const { Announcement } = getLeagueModels(conn);

      const announcements = await Announcement.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      for (const a of announcements) {
        allAnnouncements.push({
          ...a,
          leagueName: (league as any).name,
          leagueSlug: (league as any).slug,
          isRead: (a.readByOrgAdmins || []).some(
            (id: any) => id.toString() === userId,
          ),
        });
      }
    } catch {}
  }

  allAnnouncements.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ announcements: allAnnouncements });
}
