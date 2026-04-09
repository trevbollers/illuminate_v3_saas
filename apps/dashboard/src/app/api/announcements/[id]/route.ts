export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import {
  connectPlatformDB,
  connectTenantDB,
  registerLeagueModels,
  getLeagueModels,
  Tenant,
} from "@goparticipate/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/announcements/[id]?leagueSlug=xxx — view announcement detail
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const leagueSlug = searchParams.get("leagueSlug");
  if (!leagueSlug) {
    return NextResponse.json({ error: "leagueSlug query param is required" }, { status: 400 });
  }

  await connectPlatformDB();

  const league = await Tenant.findOne({ slug: leagueSlug, tenantType: "league" }).lean();
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const conn = await connectTenantDB(leagueSlug, "league");
  registerLeagueModels(conn);
  const { Announcement } = getLeagueModels(conn);

  const announcement = await Announcement.findById(id).lean();
  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await Announcement.updateOne(
    { _id: new Types.ObjectId(id) },
    { $addToSet: { readByOrgAdmins: new Types.ObjectId(userId) } }
  );

  return NextResponse.json({
    announcement: {
      ...announcement,
      leagueName: (league as any).name,
      leagueSlug,
      isRead: true,
    },
  });
}
