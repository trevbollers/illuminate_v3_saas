export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import {
  connectPlatformDB,
  connectTenantDB,
  getOrgModels,
  registerOrgModels,
  User,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/family/pending-invites — list open invites addressed to the
 * authenticated user's email across ALL org tenants.
 *
 * This is what drives the "Pending Invites" section on the family
 * dashboard. The user sees invites that are meant for them (same email),
 * and can accept them in-context from their family page.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();

  await connectPlatformDB();
  const orgTenants = (await Tenant.find({
    tenantType: "organization",
    status: { $in: ["active", "onboarding"] },
  })
    .select("slug name")
    .lean()) as any[];

  const results: Array<{
    token: string;
    role: string;
    orgName: string;
    orgSlug: string;
    teamNames: string[];
    expiresAt: Date;
    createdAt: Date;
  }> = [];

  for (const tenant of orgTenants) {
    try {
      const conn = await connectTenantDB(tenant.slug, "organization");
      registerOrgModels(conn);
      const models = getOrgModels(conn);

      const invites = (await models.Invite.find({
        email,
        status: "pending",
        expiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .lean()) as any[];

      for (const inv of invites) {
        const teamIds =
          inv.teamIds?.length > 0
            ? inv.teamIds
            : inv.teamId
              ? [inv.teamId]
              : [];
        let teamNames: string[] = [];
        if (teamIds.length > 0) {
          const teams = (await models.Team.find({ _id: { $in: teamIds } })
            .select("name divisionKey")
            .lean()) as any[];
          teamNames = teams.map((t) => `${t.name} (${t.divisionKey})`);
        }

        results.push({
          token: inv.token,
          role: inv.role,
          orgName: tenant.name,
          orgSlug: tenant.slug,
          teamNames,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        });
      }
    } catch {}
  }

  return NextResponse.json({ invites: results });
}
