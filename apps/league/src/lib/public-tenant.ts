import { headers } from "next/headers";
import { connectTenantDB, getLeagueModels, connectPlatformDB, Tenant } from "@goparticipate/db";

/**
 * Resolve the league tenant for public (unauthenticated) API routes.
 * Reads x-tenant-slug set by middleware, or falls back to a slug query param.
 */
export async function getPublicLeagueTenant(slug?: string) {
  const h = await headers();
  const tenantSlug = slug || h.get("x-tenant-slug");

  if (!tenantSlug) return null;

  // Verify this is actually a league tenant
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug, tenantType: "league" })
    .select("name slug")
    .lean();

  if (!tenant) return null;

  const conn = await connectTenantDB(tenantSlug, "league");
  const models = getLeagueModels(conn);

  return { tenant, models, tenantSlug };
}
