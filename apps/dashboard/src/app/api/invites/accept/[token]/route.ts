export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels, connectPlatformDB, User, Tenant } from "@goparticipate/db";

// GET /api/invites/accept/[token] — get invite details (no auth required)
export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
): Promise<NextResponse> {
  const { token } = params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await connectPlatformDB();

  // We need to find which org this invite belongs to. Search all org tenants.
  // In practice, the invite URL encodes the tenant — but for simplicity,
  // we store the org slug in the invite URL or look it up from the referrer.
  // For now, we use a platform-level lookup approach:
  // The token is globally unique, so we scan the request's tenant context.

  // Try to resolve tenant from the logged-in user's session first
  const session = await auth();
  const tenantSlug = session?.user?.tenantSlug;

  if (!tenantSlug) {
    // No session — return minimal info. The landing page will prompt login.
    return NextResponse.json({
      requiresAuth: true,
      message: "Please sign in to accept this invite.",
    });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  const models = getOrgModels(conn);

  const invite = await models.Invite.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  // Look up team name
  const team = await models.Team.findById(invite.teamId).select("name sport").lean();

  // Look up org name
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name").lean();

  return NextResponse.json({
    invite: {
      _id: invite._id,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    },
    team: team ? { name: (team as any).name, sport: (team as any).sport } : null,
    org: tenant ? { name: tenant.name } : null,
  });
}

// POST /api/invites/accept/[token] — accept the invite (requires auth)
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const invite = await models.Invite.findOne({
    token,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  await connectPlatformDB();

  // Map invite role to org membership role
  const roleMap: Record<string, string> = {
    player: "viewer",
    coach: "assistant_coach",
    manager: "team_manager",
    viewer: "viewer",
  };

  const membershipRole = roleMap[invite.role] ?? "viewer";

  // Check if user already has a membership for this tenant
  const tenant = await Tenant.findOne({ slug: session.user.tenantSlug }).lean();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existingMembership = user.memberships?.find(
    (m: any) => m.tenantId.toString() === tenant._id.toString(),
  );

  if (existingMembership) {
    // User already has membership — add teamId if not present
    if (!existingMembership.teamIds?.some((id: Types.ObjectId) => id.toString() === invite.teamId.toString())) {
      await User.updateOne(
        { _id: user._id, "memberships.tenantId": tenant._id },
        { $addToSet: { "memberships.$.teamIds": invite.teamId } },
      );
    }
  } else {
    // Create new membership
    await User.updateOne(
      { _id: user._id },
      {
        $push: {
          memberships: {
            tenantId: tenant._id,
            tenantType: "organization",
            role: membershipRole,
            teamIds: [invite.teamId],
            permissions: [],
            isActive: true,
            joinedAt: new Date(),
          },
        },
      },
    );
  }

  // If the invite is for a player role, also add them to the roster
  if (invite.role === "player") {
    const existingRoster = await models.Roster.findOne({
      teamId: invite.teamId,
      playerId: new Types.ObjectId(session.user.id),
      status: "active",
    }).lean();

    if (!existingRoster) {
      await models.Roster.create({
        teamId: invite.teamId,
        playerId: new Types.ObjectId(session.user.id),
        playerName: user.name ?? session.user.name ?? "Unknown",
        status: "active",
        joinedAt: new Date(),
      });
    }
  }

  // Auto-create family DB if user doesn't have one yet
  if (!user.familyId && (invite.role === "viewer" || invite.role === "player")) {
    try {
      const familyId = new Types.ObjectId();
      const { connectFamilyDB, getFamilyModels } = await import("@goparticipate/db");
      const famConn = await connectFamilyDB(familyId.toString());
      const famModels = getFamilyModels(famConn);

      await famModels.FamilyProfile.create({
        familyName: `${user.name}'s Family`,
        primaryUserId: user._id,
        orgConnections: [{
          tenantSlug: session.user.tenantSlug,
          tenantName: tenant.name,
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
        userId: user._id,
        name: user.name,
        email: user.email,
        relationship: "guardian",
        isPrimary: true,
        canMakeDecisions: true,
        playerIds: invite.playerId ? [invite.playerId] : [],
      });

      // If invite has a playerId, copy basic player info into family DB
      if (invite.playerId) {
        const { Player } = await import("@goparticipate/db");
        const platformPlayer = await Player.findById(invite.playerId).lean();
        if (platformPlayer) {
          const pp = platformPlayer as any;
          await famModels.FamilyPlayer.create({
            firstName: pp.firstName,
            lastName: pp.lastName,
            dateOfBirth: pp.dateOfBirth,
            gender: pp.gender || "other",
            photos: [],
            sizing: pp.sizing || {},
            emergencyContacts: pp.emergencyContacts || [],
            medical: pp.medical || {},
            sports: [],
            teamHistory: [{
              tenantSlug: session.user.tenantSlug,
              tenantName: tenant.name,
              teamName: (await models.Team.findById(invite.teamId).select("name").lean() as any)?.name || "",
              teamId: invite.teamId.toString(),
              sport: (await models.Team.findById(invite.teamId).select("sport").lean() as any)?.sport || "",
              season: new Date().getFullYear().toString(),
              year: new Date().getFullYear(),
              joinedAt: new Date(),
            }],
            verificationStatus: pp.verificationStatus || "unverified",
            isActive: true,
          });
        }
      }

      await User.findByIdAndUpdate(user._id, { $set: { familyId } });
    } catch (err) {
      console.error("[invite:accept] Failed to create family DB:", err);
    }
  }

  // Mark invite as accepted
  invite.status = "accepted";
  invite.acceptedBy = new Types.ObjectId(session.user.id);
  await invite.save();

  return NextResponse.json({
    success: true,
    role: membershipRole,
    message: `You've joined the team as ${invite.role}.`,
  });
}
