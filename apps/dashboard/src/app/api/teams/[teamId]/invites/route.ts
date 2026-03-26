export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import crypto from "crypto";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import { sendEmail, InviteEmail, sendSMS, detectSMSProvider } from "@goparticipate/email";

// GET /api/teams/[teamId]/invites — list pending invites
export async function GET(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const invites = await models.Invite.find({
    teamId: new Types.ObjectId(params.teamId),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(invites);
}

// POST /api/teams/[teamId]/invites — send invite(s) via email and/or SMS
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const body = await req.json();
  const { invites } = body;

  if (!invites || !Array.isArray(invites) || invites.length === 0) {
    return NextResponse.json(
      { error: "invites array is required" },
      { status: 400 },
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  // Verify team exists
  const team = await models.Team.findById(params.teamId).lean();
  if (!team || !(team as any).isActive) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const results: { email?: string; phone?: string; status: string; error?: string }[] = [];
  const baseUrl = process.env.NEXTAUTH_URL || `https://${session.user.tenantSlug}.goparticipate.com`;

  for (const inv of invites) {
    const { email, phone, role = "player" } = inv;

    if (!email && !phone) {
      results.push({ email, phone, status: "skipped", error: "Email or phone required" });
      continue;
    }

    // Check for existing pending invite with same email/phone for this team
    const existingFilter: any = {
      teamId: new Types.ObjectId(params.teamId),
      status: "pending",
      expiresAt: { $gt: new Date() },
    };
    if (email) existingFilter.email = email.toLowerCase().trim();
    if (phone) existingFilter.phone = phone.trim();

    const existing = await models.Invite.findOne(existingFilter).lean();
    if (existing) {
      results.push({ email, phone, status: "skipped", error: "Invite already pending" });
      continue;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await models.Invite.create({
      teamId: new Types.ObjectId(params.teamId),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      token,
      role,
      status: "pending",
      invitedBy: new Types.ObjectId(session.user.id),
      expiresAt,
    });

    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send email if provided
    if (email) {
      try {
        await sendEmail({
          to: email.toLowerCase().trim(),
          subject: `You're invited to join ${(team as any).name} on Go Participate`,
          react: InviteEmail({
            inviterName: session.user.name || "A coach",
            teamName: (team as any).name,
            role: role === "player" ? "Player" : role.charAt(0).toUpperCase() + role.slice(1),
            inviteUrl,
          }),
        });
        results.push({ email, phone, status: "sent" });
      } catch (err: any) {
        results.push({ email, phone, status: "email_failed", error: err.message });
      }
    }

    // Send SMS if phone provided (and no email, or in addition to email)
    if (phone && !email) {
      const smsProvider = detectSMSProvider();
      if (smsProvider) {
        try {
          const smsResult = await sendSMS({
            to: phone.trim(),
            body: `${session.user.name || "A coach"} invited you to join ${(team as any).name} on Go Participate. Accept here: ${inviteUrl}`,
          });
          if (smsResult.success) {
            results.push({ email, phone, status: "sent" });
          } else {
            results.push({ email, phone, status: "sms_failed", error: smsResult.error });
          }
        } catch (err: any) {
          results.push({ email, phone, status: "sms_failed", error: err.message });
        }
      } else {
        // No SMS provider — return the link for manual sharing
        results.push({
          email,
          phone,
          status: "sms_pending",
          error: "SMS provider not configured. Share this link: " + inviteUrl,
        });
      }
    }
  }

  return NextResponse.json({ results });
}
