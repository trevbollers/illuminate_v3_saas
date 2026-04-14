export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, Tenant } from "@goparticipate/db";

// Contexts = all the "personas" a signed-in user can act in:
//   • Platform admin (if platformRole gp_admin / gp_support)
//   • One per active tenant membership (org or league)
//   • Family / parent (if the user has a familyId)
//
// The client's RoleSwitcher dropdown uses this list to let the user
// jump between apps without logging out.

interface Context {
  /** Stable id — "platform" | "family" | tenantId */
  key: string;
  type: "platform" | "org" | "league" | "family";
  label: string;
  role: string;
  url: string;
  tenantId?: string;
  tenantSlug?: string;
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = (await User.findById(session.user.id).lean()) as any;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "/";
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "/";
  const dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "/";
  const leagueUrl = process.env.NEXT_PUBLIC_LEAGUE_URL || "/";

  const contexts: Context[] = [];

  // 1. Platform admin
  if (user.platformRole === "gp_admin" || user.platformRole === "gp_support") {
    contexts.push({
      key: "platform",
      type: "platform",
      label: "Platform Admin",
      role: user.platformRole === "gp_admin" ? "Admin" : "Support",
      url: adminUrl,
    });
  }

  // 2. One context per active tenant membership
  const activeMemberships = (user.memberships || []).filter(
    (m: any) => m.isActive,
  );

  if (activeMemberships.length > 0) {
    const tenantIds = activeMemberships.map((m: any) => m.tenantId);
    const tenants = (await Tenant.find({ _id: { $in: tenantIds } })
      .select("_id name slug tenantType")
      .lean()) as any[];
    const tenantMap = new Map(tenants.map((t) => [t._id.toString(), t]));

    for (const m of activeMemberships as any[]) {
      const tenant = tenantMap.get(m.tenantId.toString());
      if (!tenant) continue;
      const isLeague = tenant.tenantType === "league";
      contexts.push({
        key: m.tenantId.toString(),
        type: isLeague ? "league" : "org",
        tenantId: m.tenantId.toString(),
        tenantSlug: tenant.slug,
        label: tenant.name,
        role: titleCase(m.role || (isLeague ? "league_viewer" : "viewer")),
        url: isLeague ? leagueUrl : dashUrl,
      });
    }
  }

  // 3. Family / parent
  if (user.familyId) {
    contexts.push({
      key: "family",
      type: "family",
      label: "My Family",
      role: "Parent",
      url: `${appUrl}/family`,
    });
  }

  // Current active context — derived from session's active tenant + roles
  const u = session.user as any;
  let current: string | null = null;
  if (u.tenantId) {
    current = u.tenantId;
  } else if (u.platformRole === "gp_admin" || u.platformRole === "gp_support") {
    current = "platform";
  } else if (u.familyId) {
    current = "family";
  }

  return NextResponse.json({ current, contexts });
}
