export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import crypto from "crypto";
import { connectTenantDB, getOrgModels, connectPlatformDB, Player, User } from "@goparticipate/db";
import { sendEmail, InviteEmail, sendSMS } from "@goparticipate/email";

/**
 * POST /api/roster/import-players — import mapped roster data
 *
 * Flow per player:
 * 1. Check if player exists (name + DOB match) → link existing, don't duplicate
 * 2. Check if already on this team's roster → skip
 * 3. Create player if new, add to roster
 * 4. If parentEmail provided → find/create parent user, link to player, send invite
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { teamId, players } = body;

  if (!teamId || !Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }
  if (!players || !Array.isArray(players) || players.length === 0) {
    return NextResponse.json({ error: "No players to import" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { Roster, Team, Invite } = getOrgModels(conn);

  const team = await Team.findById(teamId).select("name sport divisionKey").lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await connectPlatformDB();

  const results: { name: string; status: string; playerId?: string; invited?: boolean; error?: string }[] = [];

  for (const p of players) {
    if (!p.firstName && !p.lastName) {
      results.push({ name: "Unknown", status: "skipped", error: "No name" });
      continue;
    }

    const firstName = (p.firstName || "").trim();
    const lastName = (p.lastName || "").trim();
    const playerName = `${firstName} ${lastName}`.trim();
    const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;

    try {
      // ─── 1. Find existing player by name + DOB ───
      let player: any = null;
      const nameQuery: any = {
        firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
        lastName: { $regex: new RegExp(`^${lastName}$`, "i") },
      };

      if (dob && !isNaN(dob.getTime())) {
        // Match within 1 day tolerance for DOB
        nameQuery.dateOfBirth = {
          $gte: new Date(dob.getTime() - 86400000),
          $lte: new Date(dob.getTime() + 86400000),
        };
      }

      player = await Player.findOne(nameQuery).lean();

      // ─── 2. Check if already on this team's roster ───
      if (player) {
        const existingRoster = await Roster.findOne({
          teamId: new Types.ObjectId(teamId),
          playerId: player._id,
        }).lean();

        if (existingRoster) {
          results.push({ name: playerName, status: "already_on_roster", playerId: player._id.toString() });
          continue;
        }
      }

      // ─── 3. Create player if new ───
      if (!player) {
        player = await Player.create({
          firstName,
          lastName,
          dateOfBirth: dob || new Date("2012-01-01"),
          gender: p.gender || undefined,
          guardianUserIds: [],
          sizing: {
            top: p.topSize || undefined,
            bottom: p.bottomSize || undefined,
            shoe: p.shoeSize || undefined,
          },
        });
        player = player.toObject();
      } else {
        // Update sizing if provided and not already set
        const updates: any = {};
        if (p.topSize && !player.sizing?.top) updates["sizing.top"] = p.topSize;
        if (p.bottomSize && !player.sizing?.bottom) updates["sizing.bottom"] = p.bottomSize;
        if (p.shoeSize && !player.sizing?.shoe) updates["sizing.shoe"] = p.shoeSize;
        if (Object.keys(updates).length > 0) {
          await Player.findByIdAndUpdate(player._id, { $set: updates });
        }
      }

      // ─── 4. Add to roster ───
      await Roster.create({
        teamId: new Types.ObjectId(teamId),
        playerId: player._id,
        playerName,
        jerseyNumber: p.jerseyNumber || undefined,
        position: p.position || undefined,
        status: "active",
        joinedAt: new Date(),
      });

      // ─── 5. Handle parent invite ───
      let invited = false;
      if (p.parentEmail) {
        const email = p.parentEmail.trim().toLowerCase();

        // Find or create parent user
        let parentUser: any = await User.findOne({ email }).lean();
        if (!parentUser) {
          parentUser = (await User.create({
            email,
            name: p.parentName || `${firstName}'s Parent`,
            phone: p.parentPhone || undefined,
            platformRole: "user",
            memberships: [],
            emailVerified: false,
          })).toObject();
        }

        // Link parent to player if not already linked
        const parentId = (parentUser as any)._id;
        const guardianIds = (player.guardianUserIds || []).map((id: any) => id.toString());
        if (!guardianIds.includes(parentId.toString())) {
          await Player.findByIdAndUpdate(player._id, {
            $addToSet: { guardianUserIds: parentId },
          });
        }

        // Create invite for the team
        const existingInvite = await Invite.findOne({
          teamId: new Types.ObjectId(teamId),
          email,
          status: "pending",
        }).lean();

        if (!existingInvite) {
          const token = crypto.randomBytes(16).toString("hex");
          await Invite.create({
            teamId: new Types.ObjectId(teamId),
            email,
            role: "viewer",
            playerId: player._id,
            playerName,
            token,
            status: "pending",
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            createdBy: new Types.ObjectId(userId),
          });

          // Send invite email (fire-and-forget)
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:4003";
          const inviteUrl = `${baseUrl}/invite/${token}`;
          sendEmail({
            to: email,
            subject: `You're invited to ${(team as any).name} on Go Participate`,
            react: InviteEmail({
              inviterName: "Coach",
              teamName: (team as any).name,
              role: "Parent",
              inviteUrl,
            }),
          }).catch((err) => console.error("[import] invite email failed:", err));

          // Send SMS if phone provided
          if (p.parentPhone) {
            sendSMS({
              to: p.parentPhone.trim(),
              body: `You're invited to join ${(team as any).name} on Go Participate! Accept here: ${inviteUrl}`,
            }).catch((err) => console.error("[import] invite SMS failed:", err));
          }

          invited = true;
        }
      }

      results.push({
        name: playerName,
        status: player._id ? "linked_existing" : "created",
        playerId: player._id.toString(),
        invited,
      });
    } catch (err: any) {
      results.push({ name: playerName, status: "error", error: err.message });
    }
  }

  const imported = results.filter((r) => r.status === "created" || r.status === "linked_existing");
  const alreadyOnRoster = results.filter((r) => r.status === "already_on_roster");

  return NextResponse.json({
    imported: imported.length,
    linked: results.filter((r) => r.status === "linked_existing").length,
    created: results.filter((r) => r.status === "created").length,
    alreadyOnRoster: alreadyOnRoster.length,
    invited: results.filter((r) => r.invited).length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    total: results.length,
    results,
  });
}
