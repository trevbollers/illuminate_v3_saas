import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels, connectPlatformDB, Tenant } from "@goparticipate/db";

/**
 * Get the authenticated user's org tenant DB connection + models.
 * Returns null if not authenticated or not an organization tenant.
 */
export async function getOrgTenant() {
  const session = await auth();

  if (!session?.user?.tenantSlug || session.user.tenantType !== "organization") {
    return null;
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  return {
    session,
    conn,
    models,
    userId: session.user.id,
    tenantSlug: session.user.tenantSlug,
    tenantId: session.user.tenantId,
  };
}

/**
 * Get the tenant document from the platform DB for the current org.
 */
export async function getOrgTenantDoc() {
  const session = await auth();
  if (!session?.user?.tenantSlug) return null;

  await connectPlatformDB();
  return Tenant.findOne({ slug: session.user.tenantSlug }).lean();
}
