export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import {
  connectPlatformDB,
  connectTenantDB,
  getOrgModels,
  registerOrgModels,
  User,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/invite/[token] — get invite details (no auth required)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  await connectPlatformDB();

  // Find the invite across all org tenants
  // Include both "active" and "onboarding" — newly-signed-up tenants stay
  // in onboarding until they finish the setup flow, but their invites
  // still need to be accept-able.
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

      if (invite) {
        const inv = invite as any;

        // Find ALL pending invites for this email in this org
        const allInvites = inv.email
          ? await models.Invite.find({
              email: inv.email,
              status: "pending",
              expiresAt: { $gt: new Date() },
            }).lean()
          : [inv];

        const inviteDetails = [];
        for (const i of allInvites as any[]) {
          const ids = i.teamIds?.length > 0
            ? i.teamIds
            : i.teamId ? [i.teamId] : [];
          let teamNames: string[] = [];
          if (ids.length > 0) {
            const teams = await models.Team.find({ _id: { $in: ids } })
              .select("name divisionKey")
              .lean();
            teamNames = (teams as any[]).map((t: any) => `${t.name} (${t.divisionKey})`);
          }
          inviteDetails.push({
            _id: i._id.toString(),
            token: i.token,
            role: i.role,
            teamNames,
          });
        }

        // Check if user already exists (also grab name for pre-fill)
        await connectPlatformDB();
        const existingUser = inv.email
          ? await User.findOne({ email: inv.email.toLowerCase() }).select("_id name").lean()
          : null;

        return NextResponse.json({
          valid: true,
          existingUser: !!existingUser,
          existingUserName: existingUser ? (existingUser as any).name : null,
          orgName: tenant.name,
          orgSlug: tenant.slug,
          inviteName: inv.name,
          email: inv.email,
          invites: inviteDetails,
        });
      }
    } catch {}
  }

  return NextResponse.json({ valid: false, error: "Invite not found or expired" }, { status: 404 });
}

/**
 * POST /api/invite/[token] — accept selected invites
 *
 * Body: { name, email, acceptTokens: string[] }
 * Creates or finds user account, adds membership to the org for each accepted invite.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const body = await req.json();
  const { name, email, acceptTokens } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  // acceptTokens is the list of invite tokens the user chose to accept
  // If not provided, default to just the original token
  const tokensToAccept: string[] = Array.isArray(acceptTokens) && acceptTokens.length > 0
    ? acceptTokens
    : [token];

  await connectPlatformDB();

  // Find the org by looking up the original token
  // Include both "active" and "onboarding" — newly-signed-up tenants stay
  // in onboarding until they finish the setup flow, but their invites
  // still need to be accept-able.
  const orgTenants = await Tenant.find({
    tenantType: "organization",
    status: { $in: ["active", "onboarding"] },
  })
    .select("slug name _id")
    .lean();

  let foundTenant: any = null;
  let foundModels: any = null;

  for (const tenant of orgTenants as any[]) {
    try {
      const conn = await connectTenantDB(tenant.slug, "organization");
      registerOrgModels(conn);
      const models = getOrgModels(conn);

      const invite = await models.Invite.findOne({
        token,
        status: "pending",
        expiresAt: { $gt: new Date() },
      });

      if (invite) {
        foundTenant = tenant;
        foundModels = models;
        break;
      }
    } catch {}
  }

  if (!foundTenant || !foundModels) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  const emailLower = email.toLowerCase().trim();

  // Find or create user
  let user = await User.findOne({ email: emailLower }).lean();
  let userId: Types.ObjectId;

  if (user) {
    userId = (user as any)._id;
  } else {
    const newUser = await User.create({
      email: emailLower,
      name: name.trim(),
      memberships: [],
    });
    userId = newUser._id as Types.ObjectId;
  }

  // Process each selected invite token
  const allTeamIds: Types.ObjectId[] = [];
  let highestRole = "viewer";
  const roleLevels: Record<string, number> = {
    head_coach: 60, assistant_coach: 40, team_manager: 40, player: 20, viewer: 10,
  };

  for (const t of tokensToAccept) {
    const invite = await foundModels.Invite.findOne({
      token: t,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });
    if (!invite) continue;

    const invTeamIds = invite.teamIds?.length > 0
      ? invite.teamIds
      : invite.teamId ? [invite.teamId] : [];
    allTeamIds.push(...invTeamIds);

    // Track highest role
    if ((roleLevels[invite.role] || 0) > (roleLevels[highestRole] || 0)) {
      highestRole = invite.role;
    }

    // Mark accepted
    invite.status = "accepted";
    invite.acceptedBy = userId;
    await invite.save();
  }

  // Add/update membership
  const existingMembership = (user as any)?.memberships?.find(
    (m: any) => m.tenantId?.toString() === foundTenant._id.toString(),
  );

  if (existingMembership) {
    await User.updateOne(
      { _id: userId, "memberships.tenantId": foundTenant._id },
      {
        $addToSet: { "memberships.$.teamIds": { $each: allTeamIds } },
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
            role: highestRole,
            teamIds: allTeamIds,
            isActive: true,
            joinedAt: new Date(),
          },
        },
        $set: { activeTenantId: foundTenant._id },
      },
    );
  }

  // Parent/player invites belong to a family. Ensure the user has a family
  // DB so they can add children, upload photos, etc. Staff invites skip this.
  const isParentRole = ["player", "viewer"].includes(highestRole);
  if (isParentRole) {
    // Refetch in case we created the user above
    const userNow = (await User.findById(userId).select("familyId name").lean()) as any;
    if (userNow && !userNow.familyId) {
      try {
        const familyId = new Types.ObjectId();
        const { connectFamilyDB, getFamilyModels } = await import("@goparticipate/db");
        const famConn = await connectFamilyDB(familyId.toString());
        const famModels = getFamilyModels(famConn);

        await famModels.FamilyProfile.create({
          familyName: `${userNow.name ?? name.trim()}'s Family`,
          primaryUserId: userId,
          orgConnections: [{
            tenantSlug: foundTenant.slug,
            tenantName: foundTenant.name,
            connectedAt: new Date(),
            status: "active",
          }],
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
          name: userNow.name ?? name.trim(),
          email: emailLower,
          relationship: "guardian",
          isPrimary: true,
          canMakeDecisions: true,
          playerIds: [],
        });

        await User.updateOne({ _id: userId }, { $set: { familyId } });
      } catch (err) {
        console.error("[invite] failed to auto-create family DB", err);
        // Non-fatal — user can fix later via /family Setup flow
      }
    }
  }

  // Auto-create coach profile if staff role
  if (["head_coach", "assistant_coach", "team_manager"].includes(highestRole)) {
    const existingProfile = await foundModels.CoachProfile.findOne({ userId });
    if (!existingProfile) {
      const crypto = await import("crypto");
      const checkInCode = `COACH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await foundModels.CoachProfile.create({
        userId,
        name: name.trim(),
        role: highestRole,
        email: emailLower,
        teamIds: allTeamIds,
        socials: {},
        badges: [],
        certifications: [],
        checkInCode,
        isActive: true,
      });
    } else {
      if (allTeamIds.length > 0) {
        await foundModels.CoachProfile.updateOne(
          { _id: existingProfile._id },
          { $addToSet: { teamIds: { $each: allTeamIds } } },
        );
      }
    }
  }

  // Route them to the right app after sign-in. Parents go to /family on
  // the marketing/web app (where they manage children, upload documents,
  // view schedules). Staff go to the dashboard app for team management.
  const webUrl = process.env.NEXT_PUBLIC_APP_URL || "https://goparticipate.com";
  const dashUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "";
  const continueUrl = isParentRole
    ? `${webUrl}/auth/login?callbackUrl=${encodeURIComponent("/family")}`
    : `${dashUrl}/login?welcome=true`;
  const continueLabel = isParentRole
    ? "Continue to My Family"
    : "Sign in to Dashboard";

  return NextResponse.json({
    accepted: true,
    orgName: foundTenant.name,
    orgSlug: foundTenant.slug,
    role: highestRole,
    continueUrl,
    continueLabel,
  });
}
