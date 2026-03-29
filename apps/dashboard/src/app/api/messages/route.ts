export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectTenantDB,
  connectPlatformDB,
  getOrgModels,
  resolveRecipients,
} from "@goparticipate/db";
import type { ResolvedRecipient } from "@goparticipate/db";
import {
  sendEmail,
  TeamMessageEmail,
  sendSMS,
  detectSMSProvider,
  normalizePhone,
} from "@goparticipate/email";

// GET /api/messages — list messages (inbox)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const channel = searchParams.get("channel");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const skip = (page - 1) * limit;

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message, MessageAck } = getOrgModels(conn);

  const userId = session.user.id;

  // Build query filter
  const filter: Record<string, unknown> = {};

  if (teamId) {
    filter.teamId = new Types.ObjectId(teamId);
  }

  if (channel) {
    filter.channel = channel;
  }

  // Non-admin users only see messages where they are a recipient
  const role = session.user.role;
  const isAdmin = role === "org_owner" || role === "org_admin" || role === "head_coach";

  if (!isAdmin) {
    filter.recipientUserIds = new Types.ObjectId(userId);
  }

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(filter),
  ]);

  // Enrich with ack counts for messages that require ack
  const ackMessageIds = messages
    .filter((m) => m.requiresAck)
    .map((m) => m._id);

  const ackCounts =
    ackMessageIds.length > 0
      ? await MessageAck.aggregate([
          { $match: { messageId: { $in: ackMessageIds } } },
          { $group: { _id: "$messageId", count: { $sum: 1 } } },
        ])
      : [];

  const ackCountMap = new Map(
    ackCounts.map((a: { _id: Types.ObjectId; count: number }) => [
      a._id.toString(),
      a.count,
    ])
  );

  const enriched = messages.map((m) => ({
    ...m,
    ackCount: m.requiresAck
      ? ackCountMap.get((m._id as Types.ObjectId).toString()) || 0
      : undefined,
    recipientCount: m.requiresAck ? m.recipientUserIds?.length || 0 : undefined,
    isRead: m.readBy?.some(
      (id: Types.ObjectId) => id.toString() === userId
    ),
  }));

  return NextResponse.json({
    messages: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/messages — send a new message
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    teamId,
    channel,
    subject,
    body: messageBody,
    priority = "normal",
    requiresAck = false,
    ackOptions = [],
    deliveryChannels = ["in_app"],
  } = body;

  // Validate required fields
  if (!channel || !messageBody) {
    return NextResponse.json(
      { error: "channel and body are required" },
      { status: 400 }
    );
  }

  if (channel !== "org" && !teamId) {
    return NextResponse.json(
      { error: "teamId is required for non-org channels" },
      { status: 400 }
    );
  }

  if (requiresAck && (!ackOptions || ackOptions.length === 0)) {
    return NextResponse.json(
      { error: "ackOptions are required when requiresAck is true" },
      { status: 400 }
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message } = getOrgModels(conn);

  // Resolve recipients at send time
  const recipients = await resolveRecipients(conn, channel, teamId);
  const recipientUserIds = recipients.map((r) => new Types.ObjectId(r.userId));

  // Get author name from platform DB
  const platformDb = await connectPlatformDB();
  const User = platformDb.model("User");
  const author = await User.findById(session.user.id).lean() as { name: string } | null;

  const message = await Message.create({
    teamId: teamId ? new Types.ObjectId(teamId) : undefined,
    channel,
    authorId: new Types.ObjectId(session.user.id),
    authorName: author?.name || session.user.name || "Unknown",
    subject,
    body: messageBody,
    priority,
    requiresAck,
    ackOptions,
    deliveryChannels,
    recipientUserIds,
    pinned: false,
    readBy: [],
    deliveryLog: [],
  });

  // --- Email / SMS delivery (fire-and-forget, don't block response) ---
  const messageId = (message._id as Types.ObjectId).toString();
  const baseUrl = process.env.NEXTAUTH_URL || `https://${session.user.tenantSlug}.goparticipate.com`;
  const messageUrl = `${baseUrl}/communication/${messageId}`;

  // Get team name for email template
  let teamName = "Your Team";
  if (teamId) {
    const { Team } = getOrgModels(conn);
    const team = await Team.findById(teamId).select("name").lean() as { name: string } | null;
    if (team) teamName = team.name;
  }

  const authorName = author?.name || session.user.name || "Coach";

  // Deliver emails and SMS in the background
  deliverMessages({
    recipients,
    deliveryChannels,
    priority,
    messageId,
    messageUrl,
    authorName,
    teamName,
    subject,
    messageBody,
    requiresAck,
    ackOptions,
    Message,
  }).catch(() => {});

  return NextResponse.json({ message }, { status: 201 });
}

/**
 * Send email/SMS to resolved recipients. Updates deliveryLog on the message.
 * Runs after the response is sent to avoid blocking the user.
 */
async function deliverMessages({
  recipients,
  deliveryChannels,
  priority,
  messageId,
  messageUrl,
  authorName,
  teamName,
  subject,
  messageBody,
  requiresAck,
  ackOptions,
  Message,
}: {
  recipients: ResolvedRecipient[];
  deliveryChannels: string[];
  priority: string;
  messageId: string;
  messageUrl: string;
  authorName: string;
  teamName: string;
  subject?: string;
  messageBody: string;
  requiresAck: boolean;
  ackOptions: string[];
  Message: any;
}) {
  const deliveryLog: Array<{
    channel: "email" | "sms";
    recipientUserId: Types.ObjectId;
    sentAt: Date;
    status: "sent" | "failed";
    externalId?: string;
  }> = [];

  const shouldEmail = deliveryChannels.includes("email");
  const shouldSMS = deliveryChannels.includes("sms") && priority === "urgent";
  const smsProvider = shouldSMS ? detectSMSProvider() : null;

  for (const recipient of recipients) {
    // --- Email ---
    if (shouldEmail && recipient.notificationPreferences.emailMessages && recipient.email) {
      try {
        const result = await sendEmail({
          to: recipient.email,
          subject: subject || `New message from ${authorName}`,
          react: TeamMessageEmail({
            authorName,
            teamName,
            subject,
            body: messageBody,
            priority: priority as "normal" | "urgent",
            requiresAck,
            ackOptions: requiresAck ? ackOptions : undefined,
            messageUrl,
          }),
        });
        deliveryLog.push({
          channel: "email",
          recipientUserId: new Types.ObjectId(recipient.userId),
          sentAt: new Date(),
          status: "sent",
          externalId: result.id,
        });
      } catch {
        deliveryLog.push({
          channel: "email",
          recipientUserId: new Types.ObjectId(recipient.userId),
          sentAt: new Date(),
          status: "failed",
        });
      }
    }

    // --- SMS (urgent only, opt-in only) ---
    if (shouldSMS && smsProvider && recipient.notificationPreferences.smsUrgent && recipient.phone) {
      try {
        const normalized = normalizePhone(recipient.phone);
        if (normalized) {
          const smsBody = subject
            ? `URGENT from ${teamName}: ${subject} — ${messageBody.slice(0, 120)}`
            : `URGENT from ${teamName}: ${messageBody.slice(0, 140)}`;
          const result = await sendSMS({ to: normalized, body: smsBody });
          deliveryLog.push({
            channel: "sms",
            recipientUserId: new Types.ObjectId(recipient.userId),
            sentAt: new Date(),
            status: result.success ? "sent" : "failed",
            externalId: result.messageId,
          });
        }
      } catch {
        deliveryLog.push({
          channel: "sms",
          recipientUserId: new Types.ObjectId(recipient.userId),
          sentAt: new Date(),
          status: "failed",
        });
      }
    }
  }

  // Persist delivery log
  if (deliveryLog.length > 0) {
    await Message.findByIdAndUpdate(messageId, {
      $push: { deliveryLog: { $each: deliveryLog } },
    });
  }
}
