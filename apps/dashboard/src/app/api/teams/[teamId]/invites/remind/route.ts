export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";
import { sendEmail, sendSMS, detectSMSProvider } from "@goparticipate/email";

/**
 * POST /api/teams/[teamId]/invites/remind — resend an invite reminder
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const body = await req.json();
  const { inviteId } = body;

  if (!inviteId || !Types.ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const invite = await models.Invite.findOne({
    _id: new Types.ObjectId(inviteId),
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  const inv = invite as any;

  // Get team name
  const team = await models.Team.findById(teamId).select("name").lean();
  const teamName = (team as any)?.name || "your team";

  // Invite links point at the web app's /invite/[token] router — see
  // apps/web/src/app/invite/[token]/page.tsx for the flow.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:4000"
      : `https://goparticipate.com`);
  const inviteUrl = `${baseUrl}/invite/${inv.token}`;

  let sent = false;

  if (inv.email) {
    try {
      await sendEmail({
        to: inv.email,
        subject: `Reminder: You're invited to join ${teamName} on Go Participate`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <h2 style="color:#1e293b;">Friendly Reminder</h2>
            <p>You have a pending invitation to join <strong>${teamName}</strong> on Go Participate.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                Accept Invite
              </a>
            </div>
            <p style="font-size:13px;color:#94a3b8;">This invite expires on ${new Date(inv.expiresAt).toLocaleDateString()}.</p>
          </div>
        `,
      });
      sent = true;
    } catch (err) {
      console.error("[remind] email failed:", err);
    }
  }

  if (inv.phone && !sent) {
    const smsProvider = detectSMSProvider();
    if (smsProvider) {
      try {
        await sendSMS({
          to: inv.phone,
          body: `Reminder: You're invited to join ${teamName} on Go Participate. Accept here: ${inviteUrl}`,
        });
        sent = true;
      } catch (err) {
        console.error("[remind] SMS failed:", err);
      }
    }
  }

  if (!sent) {
    return NextResponse.json({
      sent: false,
      inviteUrl,
      message: "Could not send notification. Share this link manually: " + inviteUrl,
    });
  }

  return NextResponse.json({ sent: true });
}
