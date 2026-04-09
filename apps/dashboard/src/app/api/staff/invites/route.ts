export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import crypto from "crypto";
import {
  connectPlatformDB,
  connectTenantDB,
  getOrgModels,
  registerOrgModels,
  User,
  Tenant,
} from "@goparticipate/db";
import { sendEmail } from "@goparticipate/email";

/**
 * GET /api/staff/invites — list all pending staff invites for this org
 */
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const invites = await models.Invite.find({
    status: "pending",
    expiresAt: { $gt: new Date() },
    role: { $in: ["head_coach", "assistant_coach", "team_manager"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Get team names for display
  const teamIds = new Set<string>();
  for (const inv of invites as any[]) {
    if (inv.teamId) teamIds.add(inv.teamId.toString());
    if (inv.teamIds) inv.teamIds.forEach((id: any) => teamIds.add(id.toString()));
  }

  const teams = teamIds.size > 0
    ? await models.Team.find({ _id: { $in: [...teamIds].map((id) => new Types.ObjectId(id)) } })
        .select("name")
        .lean()
    : [];
  const teamMap = new Map((teams as any[]).map((t) => [t._id.toString(), t.name]));

  const enriched = (invites as any[]).map((inv) => ({
    ...inv,
    teamName: inv.teamId ? teamMap.get(inv.teamId.toString()) : undefined,
    teamNames: inv.teamIds?.map((id: any) => teamMap.get(id.toString())).filter(Boolean),
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/staff/invites — send a staff invite
 *
 * Body: { name, email, phone?, role, teamIds? }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const userRole = h.get("x-user-role");

  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owner, admin, or head coach can invite staff
  if (!userRole || !["org_owner", "org_admin", "head_coach"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, role, teamIds } = body;

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }
  if (!role || !["head_coach", "assistant_coach", "team_manager"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Head coaches can only invite assistant coaches and team managers
  if (userRole === "head_coach" && role === "head_coach") {
    return NextResponse.json(
      { error: "Head coaches cannot invite other head coaches" },
      { status: 403 },
    );
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const emailLower = email?.toLowerCase().trim();

  // Check for existing pending invite
  if (emailLower) {
    const existing = await models.Invite.findOne({
      email: emailLower,
      role,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An invite is already pending for this email" },
        { status: 409 },
      );
    }
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await models.Invite.create({
    teamId: teamIds?.length === 1 ? new Types.ObjectId(teamIds[0]) : undefined,
    teamIds: teamIds?.length > 0
      ? teamIds.map((id: string) => new Types.ObjectId(id))
      : undefined,
    email: emailLower,
    phone: phone?.trim() || undefined,
    name: name?.trim() || undefined,
    token,
    role,
    status: "pending",
    invitedBy: new Types.ObjectId(userId),
    expiresAt,
  });

  // Get org name for the email
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name").lean();
  const orgName = (tenant as any)?.name || tenantSlug;

  // Get inviter name
  const inviter = await User.findById(userId).select("name").lean();
  const inviterName = (inviter as any)?.name || "An administrator";

  // Get team names
  let teamNameStr = "";
  if (teamIds?.length > 0) {
    const teams = await models.Team.find({
      _id: { $in: teamIds.map((id: string) => new Types.ObjectId(id)) },
    }).select("name").lean();
    teamNameStr = (teams as any[]).map((t) => t.name).join(", ");
  }

  const roleLabels: Record<string, string> = {
    head_coach: "Head Coach",
    assistant_coach: "Assistant Coach",
    team_manager: "Team Manager",
  };

  const baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:4003"
      : `https://${tenantSlug}.goparticipate.com`);
  const inviteUrl = `${baseUrl}/invite/${token}`;

  // Send email
  if (emailLower) {
    try {
      await sendEmail({
        to: emailLower,
        subject: `You're invited to coach with ${orgName} on Go Participate`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#1e293b;">You've been invited!</h2>
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${roleLabels[role] || role}</strong>.</p>
            ${teamNameStr ? `<p style="color:#64748b;">Teams: ${teamNameStr}</p>` : ""}
            <p>With Go Participate, you can:</p>
            <ul style="color:#475569;">
              <li>Manage your team roster</li>
              <li>Create and view schedules</li>
              <li>Track attendance and stats</li>
              <li>Communicate with parents</li>
            </ul>
            <div style="text-align:center;margin:24px 0;">
              <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Accept Invite
              </a>
            </div>
            <p style="font-size:13px;color:#94a3b8;">This invite expires in 7 days. If you didn't expect this, you can ignore it.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[staff invite] email failed:", err);
    }
  }

  return NextResponse.json({
    invite: invite.toObject(),
    inviteUrl,
  });
}
