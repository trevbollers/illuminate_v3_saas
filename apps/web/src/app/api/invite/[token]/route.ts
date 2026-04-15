export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  connectPlatformDB,
  connectTenantDB,
  getOrgModels,
  registerOrgModels,
  User,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/invite/[token] — resolve an invite token to its metadata.
 *
 * Public (no auth) — the invite token itself is the "right to view".
 * Returns what the /invite/[token] router page needs to decide where
 * to send the parent next (signup, login, or straight to /family).
 *
 * Actual acceptance now happens from INSIDE the authenticated family
 * dashboard via POST /api/family/invites/[token]/accept — not here.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  await connectPlatformDB();

  // Include onboarding tenants (fresh signups stay in onboarding until the
  // owner completes setup — their invites still need to be findable).
  const orgTenants = await Tenant.find({
    tenantType: "organization",
    status: { $in: ["active", "onboarding"] },
  })
    .select("slug name")
    .lean();

  for (const tenant of orgTenants as any[]) {
    try {
      const conn = await connectTenantDB(tenant.slug, "organization");
      registerOrgModels(conn);
      const models = getOrgModels(conn);

      const invite = await models.Invite.findOne({
        token,
        status: "pending",
        expiresAt: { $gt: new Date() },
      }).lean();

      if (!invite) continue;
      const inv = invite as any;

      // Resolve team names for display on the router page
      const teamIds =
        inv.teamIds?.length > 0 ? inv.teamIds : inv.teamId ? [inv.teamId] : [];
      let teamNames: string[] = [];
      if (teamIds.length > 0) {
        const teams = (await models.Team.find({ _id: { $in: teamIds } })
          .select("name divisionKey")
          .lean()) as any[];
        teamNames = teams.map((t) => `${t.name} (${t.divisionKey})`);
      }

      // Does a user already exist for this email?
      const existingUser = inv.email
        ? ((await User.findOne({ email: inv.email.toLowerCase() })
            .select("_id name")
            .lean()) as any)
        : null;

      return NextResponse.json({
        valid: true,
        token,
        role: inv.role,
        email: inv.email,
        inviteName: inv.name,
        orgName: tenant.name,
        orgSlug: tenant.slug,
        teamNames,
        expiresAt: inv.expiresAt,
        existingUser: !!existingUser,
        existingUserName: existingUser?.name ?? null,
      });
    } catch {}
  }

  return NextResponse.json(
    { valid: false, error: "Invite not found or expired" },
    { status: 404 },
  );
}
