export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import crypto from "crypto";

/**
 * POST /api/tryouts/[sessionId]/decide — assign a player to a team or not invited
 *
 * Body: { registrationId, decision: "invited"|"not_invited"|"waitlist", teamId?, notes? }
 *
 * If decision = "invited" and teamId provided, auto-creates an Invite for the player.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();
  const { registrationId, decision, teamId, notes } = body;

  if (!registrationId || !decision) {
    return NextResponse.json({ error: "registrationId and decision required" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession, TryoutRegistration, TryoutDecision, Team, Invite } = getOrgModels(conn);

  const [session, registration] = await Promise.all([
    TryoutSession.findById(sessionId).lean(),
    TryoutRegistration.findById(registrationId).lean(),
  ]);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const reg = registration as any;
  let teamName: string | undefined;
  let inviteId: Types.ObjectId | undefined;

  // If invited to a team, get team name and create invite
  if (decision === "invited" && teamId) {
    const team = await Team.findById(teamId).select("name").lean();
    teamName = (team as any)?.name;

    // Create an invite token for this player
    const token = crypto.randomBytes(16).toString("hex");
    const invite = await Invite.create({
      teamId: new Types.ObjectId(teamId),
      email: "", // Will be filled when parent accepts
      role: "viewer",
      playerId: reg.playerId,
      playerName: reg.playerName,
      token,
      status: "pending",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      createdBy: new Types.ObjectId(userId),
    });
    inviteId = (invite as any)._id;
  }

  // Upsert decision
  const tryoutDecision = await TryoutDecision.findOneAndUpdate(
    {
      sessionId: new Types.ObjectId(sessionId),
      playerId: reg.playerId,
    },
    {
      $set: {
        registrationId: new Types.ObjectId(registrationId),
        playerName: reg.playerName,
        decision,
        teamId: teamId ? new Types.ObjectId(teamId) : undefined,
        teamName,
        decidedBy: new Types.ObjectId(userId),
        decidedAt: new Date(),
        inviteId,
        inviteStatus: inviteId ? "pending" : undefined,
        notes,
      },
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json(tryoutDecision);
}
