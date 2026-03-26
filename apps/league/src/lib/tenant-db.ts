import { auth } from "@/lib/auth";
import { connectTenantDB, getLeagueModels } from "@goparticipate/db";

/**
 * Get the authenticated user's league tenant DB connection + models.
 * Returns null if not authenticated or not a league tenant.
 */
export async function getLeagueTenant() {
  const session = await auth();

  if (!session?.user?.tenantSlug || session.user.tenantType !== "league") {
    return null;
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "league");
  const models = getLeagueModels(conn);

  return {
    session,
    conn,
    models,
    userId: session.user.id,
    tenantSlug: session.user.tenantSlug,
  };
}
