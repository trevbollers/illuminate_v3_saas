export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import crypto from "crypto";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// GET /api/invites — list invites for the org (optionally filter by teamId)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const filter: any = { status: "pending" };
  if (teamId && Types.ObjectId.isValid(teamId)) {
    filter.teamId = new Types.ObjectId(teamId);
  }

  const invites = await models.Invite.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(invites);
}

// POST /api/invites — create a new invite
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only coaches/admins/owners can invite
  const allowedRoles = ["org_owner", "org_admin", "head_coach", "assistant_coach", "team_manager"];
  if (!allowedRoles.includes(role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { teamId, email, phone, role: inviteRole } = body;

  if (!teamId || !Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Valid teamId is required" }, { status: 400 });
  }

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  }

  const validRoles = ["player", "coach", "manager", "viewer"];
  if (!inviteRole || !validRoles.includes(inviteRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  // Verify team exists
  const team = await models.Team.findById(teamId).lean();
  if (!team || !(team as any).isActive) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check for existing pending invite
  const contactFilter: any = {
    teamId: new Types.ObjectId(teamId),
    status: "pending",
  };
  if (email) contactFilter.email = email.trim().toLowerCase();
  else contactFilter.phone = phone.trim();

  const existing = await models.Invite.findOne(contactFilter).lean();
  if (existing) {
    return NextResponse.json(
      { error: "An invite is already pending for this contact" },
      { status: 409 },
    );
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await models.Invite.create({
    teamId: new Types.ObjectId(teamId),
    email: email ? email.trim().toLowerCase() : undefined,
    phone: phone ? phone.trim() : undefined,
    token,
    role: inviteRole,
    status: "pending",
    invitedBy: new Types.ObjectId(userId),
    expiresAt,
  });

  // Build invite URL
  const baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:4003";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json({
    invite,
    inviteUrl,
    message: `Invite created. Share this link: ${inviteUrl}`,
  }, { status: 201 });
}

// DELETE /api/invites?inviteId=xxx — revoke an invite
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("inviteId");

  if (!inviteId || !Types.ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  await models.Invite.findByIdAndUpdate(inviteId, {
    $set: { status: "revoked" },
  });

  return NextResponse.json({ success: true });
}
