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
  Player,
  Family,
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
 * - For parent-role invites (player/viewer): creates a Roster entry on
 *   the team linking to the chosen FamilyPlayer, and adds the team to
 *   that player's teamHistory. The request must include { playerId }
 *   identifying which child is joining the team. If the family has no
 *   children yet, returns 400 with code: "NEED_PLAYER".
 * - Marks the invite as accepted
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const sessionEmail = session.user.email.toLowerCase();
  const body = await req.json().catch(() => ({}));
  const requestedPlayerId: string | undefined = body?.playerId;

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

  const isParentRole = ["player", "viewer"].includes(invite.role);

  // ─── Parent-role flow: player selection gate ─────────────────────────
  // The accepting user is a parent claiming an invite for THEIR CHILD.
  // We need to know which child is joining this team so we can roster
  // them. Before touching memberships, ensure:
  //   • Family context exists (auto-create if missing)
  //   • Family has at least one FamilyPlayer (NEED_PLAYER otherwise)
  //   • Request body included playerId referencing a child in this family
  //
  // If any gate fails, bail with a 400 and a code the UI can act on —
  // no state is mutated.
  let familyId: Types.ObjectId | null = user.familyId ?? null;
  let selectedPlayer: any = null;

  if (isParentRole) {
    // Auto-create family DB + platform Family doc for first-time parent
    // signups. The platform Family's _id matches the familyId used to
    // name the family DB so we have one consistent identifier.
    if (!familyId) {
      const newFamilyId = new Types.ObjectId();
      try {
        await Family.create({
          _id: newFamilyId,
          name: `${user.name ?? "Your"} Family`,
          guardianUserIds: [userId],
          playerIds: [],
        });

        const famConn = await connectFamilyDB(newFamilyId.toString());
        const famModels = getFamilyModels(famConn);

        await famModels.FamilyProfile.create({
          familyName: `${user.name ?? "Your"} Family`,
          primaryUserId: userId,
          orgConnections: [],
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

        await User.updateOne({ _id: userId }, { $set: { familyId: newFamilyId } });
        familyId = newFamilyId;
      } catch (err) {
        console.error("[accept-invite] family auto-create failed", err);
        return NextResponse.json(
          { error: "Failed to set up your family profile. Please try again." },
          { status: 500 },
        );
      }
    } else {
      // Family DB exists but platform Family doc may not (legacy data from
      // before this flow existed). Upsert idempotently.
      await Family.updateOne(
        { _id: familyId },
        {
          $setOnInsert: {
            _id: familyId,
            name: `${user.name ?? "Your"} Family`,
          },
          $addToSet: { guardianUserIds: userId },
        },
        { upsert: true },
      );
    }

    // Require a child to be chosen + loaded
    const famConn = await connectFamilyDB(familyId!.toString());
    const famModels = getFamilyModels(famConn);
    const allPlayers = (await famModels.FamilyPlayer.find({ isActive: true })
      .select("_id firstName lastName dateOfBirth gender platformPlayerId")
      .lean()) as any[];

    if (allPlayers.length === 0) {
      return NextResponse.json(
        {
          error: "Add a child to your family before accepting this team invite.",
          code: "NEED_PLAYER",
        },
        { status: 400 },
      );
    }

    if (!requestedPlayerId || !Types.ObjectId.isValid(requestedPlayerId)) {
      return NextResponse.json(
        {
          error: "Select which child is joining this team.",
          code: "NEED_PLAYER_SELECTION",
          players: allPlayers.map((p) => ({
            _id: p._id.toString(),
            firstName: p.firstName,
            lastName: p.lastName,
          })),
        },
        { status: 400 },
      );
    }

    selectedPlayer = allPlayers.find(
      (p) => p._id.toString() === requestedPlayerId,
    );
    if (!selectedPlayer) {
      return NextResponse.json(
        {
          error: "That child is not in your family.",
          code: "INVALID_PLAYER",
        },
        { status: 400 },
      );
    }
  }

  // ─── Add / update parent's org membership ──────────────────────────────
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

  // Record the org connection in the family profile
  if (isParentRole && familyId) {
    try {
      const famConn = await connectFamilyDB(familyId.toString());
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

  // ─── Roster the chosen child on each team named on the invite ─────────
  if (isParentRole && selectedPlayer && inviteTeamIds.length > 0 && familyId) {
    const orgConn = await connectTenantDB(foundTenant.slug, "organization");
    registerOrgModels(orgConn);
    const orgModels = getOrgModels(orgConn);
    const playerName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`.trim();
    const familyPlayerId = selectedPlayer._id;

    // Find or create the PLATFORM Player record for this child. Roster
    // entries reference the platform Player so resolveRecipients can walk
    // Roster → Player.guardianUserIds → Users for email/SMS delivery.
    // The FamilyPlayer holds the richer family-side profile.
    let platformPlayerId: Types.ObjectId;
    if (selectedPlayer.platformPlayerId) {
      platformPlayerId = selectedPlayer.platformPlayerId as Types.ObjectId;
      // Make sure guardianUserIds includes this parent (edge case: adding a
      // co-parent later). Idempotent.
      await Player.updateOne(
        { _id: platformPlayerId },
        { $addToSet: { guardianUserIds: userId } },
      );
    } else {
      const created = await Player.create({
        firstName: selectedPlayer.firstName,
        lastName: selectedPlayer.lastName,
        dateOfBirth: selectedPlayer.dateOfBirth,
        gender: selectedPlayer.gender,
        familyId,
        guardianUserIds: [userId],
        emergencyContacts: [],
        medical: {},
        sizing: {},
        socials: {},
        verificationStatus: "unverified",
        isActive: true,
      });
      platformPlayerId = created._id as Types.ObjectId;

      // Link back from FamilyPlayer so future rosters reuse the same id
      const famConn = await connectFamilyDB(familyId.toString());
      const famModels = getFamilyModels(famConn);
      await famModels.FamilyPlayer.updateOne(
        { _id: familyPlayerId },
        { $set: { platformPlayerId } },
      );

      // Record on the platform Family's playerIds too
      await Family.updateOne(
        { _id: familyId },
        { $addToSet: { playerIds: platformPlayerId } },
      );
    }

    // Pull team names so we can update FamilyPlayer.teamHistory
    const teams = (await orgModels.Team.find({ _id: { $in: inviteTeamIds } })
      .select("name sport")
      .lean()) as any[];
    const teamMap = new Map(teams.map((t) => [t._id.toString(), t]));

    for (const teamId of inviteTeamIds) {
      // Idempotent — skip if this player is already on this roster
      const existingRoster = await orgModels.Roster.findOne({
        teamId,
        playerId: platformPlayerId,
        status: "active",
      }).lean();

      if (!existingRoster) {
        try {
          await orgModels.Roster.create({
            teamId,
            playerId: platformPlayerId,
            playerName,
            status: "active",
            joinedAt: new Date(),
          });
        } catch (err) {
          console.error("[accept-invite] roster entry create failed", err);
          // Non-fatal — parent gets the membership either way. Admin can
          // manually add the player from the team page if needed.
        }
      }

      // Add this team to the player's teamHistory (denormalized for the
      // family dashboard)
      const team = teamMap.get(teamId.toString());
      if (team && familyId) {
        try {
          const famConn = await connectFamilyDB(familyId.toString());
          const famModels = getFamilyModels(famConn);
          const currentYear = new Date().getFullYear();
          await famModels.FamilyPlayer.updateOne(
            { _id: familyPlayerId },
            {
              $push: {
                teamHistory: {
                  tenantSlug: foundTenant.slug,
                  tenantName: foundTenant.name,
                  teamName: team.name,
                  teamId: teamId.toString(),
                  sport: team.sport ?? "",
                  season: `${currentYear}-${currentYear + 1}`,
                  year: currentYear,
                  role: "player",
                  joinedAt: new Date(),
                },
              },
            },
          );
        } catch (err) {
          console.error("[accept-invite] teamHistory push failed", err);
        }
      }
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
    teamCount: inviteTeamIds.length,
    playerName: selectedPlayer
      ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`.trim()
      : null,
  });
}
