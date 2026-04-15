export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectPlatformDB,
  connectTenantDB,
  connectFamilyDB,
  getOrgModels,
  registerOrgModels,
  getFamilyModels,
  User,
  Tenant,
} from "@goparticipate/db";

/**
 * POST /api/family/invites/[token]/accept — accept a team invite from
 * inside the authenticated family dashboard.
 *
 * Security:
 * - Must be signed in
 * - The invite's `email` field must match the signed-in user's email
 *   (anyone with the URL can read the invite, but only the intended
 *   recipient can claim it)
 *
 * Effects:
 * - Adds an org membership for the user (with the invite's role)
 * - Creates a family DB for the user if they don't have one yet
 * - Marks the invite as accepted
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const sessionEmail = session.user.email.toLowerCase();

  await connectPlatformDB();

  // Locate the tenant + invite by scanning org tenants for this token.
  const orgTenants = (await Tenant.find({
    tenantType: "organization",
    status: { $in: ["active", "onboarding"] },
  })
    .select("slug name _id")
    .lean()) as any[];

  let foundTenant: any = null;
  let foundModels: any = null;
  let invite: any = null;

  for (const tenant of orgTenants) {
    try {
      const conn = await connectTenantDB(tenant.slug, "organization");
      registerOrgModels(conn);
      const models = getOrgModels(conn);
      const candidate = await models.Invite.findOne({
        token,
        status: "pending",
        expiresAt: { $gt: new Date() },
      });
      if (candidate) {
        foundTenant = tenant;
        foundModels = models;
        invite = candidate;
        break;
      }
    } catch {}
  }

  if (!foundTenant || !invite) {
    return NextResponse.json(
      { error: "Invite not found or expired" },
      { status: 404 },
    );
  }

  // Verify the invite is for THIS user (by email)
  if (
    invite.email &&
    invite.email.toLowerCase() !== sessionEmail
  ) {
    return NextResponse.json(
      {
        error:
          "This invite was sent to a different email. Sign in with the email that received the invite, or contact the team admin to resend.",
      },
      { status: 403 },
    );
  }

  const userId = new Types.ObjectId(session.user.id);
  const user = (await User.findById(userId).lean()) as any;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Resolve team ids on the invite
  const inviteTeamIds: Types.ObjectId[] =
    invite.teamIds?.length > 0
      ? invite.teamIds
      : invite.teamId
        ? [invite.teamId]
        : [];

  // Add / update membership
  const existingMembership = (user.memberships ?? []).find(
    (m: any) => m.tenantId?.toString() === foundTenant._id.toString(),
  );

  if (existingMembership) {
    await User.updateOne(
      { _id: userId, "memberships.tenantId": foundTenant._id },
      {
        $addToSet: {
          "memberships.$.teamIds": { $each: inviteTeamIds },
        },
        $set: { "memberships.$.isActive": true },
      },
    );
  } else {
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          memberships: {
            tenantId: foundTenant._id,
            tenantSlug: foundTenant.slug,
            tenantType: "organization",
            role: invite.role,
            teamIds: inviteTeamIds,
            isActive: true,
            joinedAt: new Date(),
          },
        },
      },
    );
  }

  // Ensure the user has a family context (auto-create if missing, since
  // parent-role invites presume this is a family user). Staff-role flow
  // doesn't go through this endpoint.
  const isParentRole = ["player", "viewer"].includes(invite.role);
  if (isParentRole && !user.familyId) {
    try {
      const familyId = new Types.ObjectId();
      const famConn = await connectFamilyDB(familyId.toString());
      const famModels = getFamilyModels(famConn);

      await famModels.FamilyProfile.create({
        familyName: `${user.name ?? "Your"} Family`,
        primaryUserId: userId,
        orgConnections: [
          {
            tenantSlug: foundTenant.slug,
            tenantName: foundTenant.name,
            connectedAt: new Date(),
            status: "active",
          },
        ],
        leagueConnections: [],
        programHistory: [],
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          shareVerificationAcrossLeagues: true,
        },
      });

      await famModels.FamilyGuardian.create({
        userId,
        name: user.name ?? "Guardian",
        email: sessionEmail,
        relationship: "guardian",
        isPrimary: true,
        canMakeDecisions: true,
        playerIds: [],
      });

      await User.updateOne({ _id: userId }, { $set: { familyId } });
    } catch (err) {
      console.error("[accept-invite] family DB auto-create failed", err);
      // Non-fatal — user can fix later via /family setup
    }
  } else if (isParentRole && user.familyId) {
    // Existing family — just record the org connection in the family profile
    try {
      const famConn = await connectFamilyDB(user.familyId.toString());
      const famModels = getFamilyModels(famConn);
      await famModels.FamilyProfile.updateOne(
        { primaryUserId: userId },
        {
          $addToSet: {
            orgConnections: {
              tenantSlug: foundTenant.slug,
              tenantName: foundTenant.name,
              connectedAt: new Date(),
              status: "active",
            },
          },
        },
      );
    } catch (err) {
      console.error("[accept-invite] family orgConnections update failed", err);
    }
  }

  // Mark invite accepted
  invite.status = "accepted";
  invite.acceptedBy = userId;
  await invite.save();

  return NextResponse.json({
    accepted: true,
    orgName: foundTenant.name,
    orgSlug: foundTenant.slug,
    role: invite.role,
    teamNames: inviteTeamIds.length,
  });
}
