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

        // Check if user already exists
        await connectPlatformDB();
        const existingUser = inv.email
          ? await User.findOne({ email: inv.email.toLowerCase() }).select("_id").lean()
          : null;

        return NextResponse.json({
          valid: true,
          existingUser: !!existingUser,
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

  return NextResponse.json({
    accepted: true,
    orgName: foundTenant.name,
    orgSlug: foundTenant.slug,
    role: highestRole,
  });
}
