export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant, connectTenantDB, getLeagueModels, getOrgModels } from "@goparticipate/db";

/**
 * GET /api/public/[slug] — resolve a tenant by slug and return public data.
 *
 * Returns tenant profile + content based on type:
 *   - League: published events with basic info
 *   - Org: teams, upcoming schedule, store link
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  const { slug } = params;

  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug })
    .select("name slug tenantType sport settings logoUrl bannerUrl")
    .lean();

  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const t = tenant as any;
  const base = {
    name: t.name,
    slug: t.slug,
    tenantType: t.tenantType,
    sport: t.sport,
    logoUrl: t.logoUrl,
    bannerUrl: t.bannerUrl,
    tagline: t.settings?.tagline || "",
    description: t.settings?.description || "",
  };

  // ─── League tenant ───
  if (t.tenantType === "league") {
    const conn = await connectTenantDB(slug, "league");
    const models = getLeagueModels(conn);

    const events = await models.Event.find({
      status: { $in: ["published", "registration_open", "registration_closed", "in_progress", "completed"] },
    })
      .sort({ startDate: 1 })
      .select("name slug type sport startDate endDate status locations bannerUrl")
      .lean();

    return NextResponse.json({ ...base, events });
  }

  // ─── Org tenant ───
  if (t.tenantType === "organization") {
    const conn = await connectTenantDB(slug, "organization");
    const models = getOrgModels(conn);

    const [teams, upcomingEvents, products] = await Promise.all([
      models.Team.find({ isActive: { $ne: false } })
        .select("name sport ageGroup logoUrl")
        .sort({ name: 1 })
        .lean(),
      models.OrgEvent?.find({
        startDate: { $gte: new Date() },
        isPublic: true,
      })
        .sort({ startDate: 1 })
        .limit(10)
        .select("title type startDate endDate location")
        .lean() ?? [],
      models.Product?.find({ isActive: true })
        .sort({ sortOrder: 1 })
        .limit(6)
        .select("name slug price images category")
        .lean() ?? [],
    ]);

    return NextResponse.json({
      ...base,
      teams,
      upcomingEvents,
      products,
      hasStore: products.length > 0,
    });
  }

  return NextResponse.json({ ...base });
}
