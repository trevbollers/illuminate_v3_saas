export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

// GET /api/messages/[messageId] — message detail
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await context.params;
  if (!Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message, MessageAck, Team } = getOrgModels(conn);

  const message = await Message.findById(messageId).lean();
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const userId = session.user.id;

  // Mark as read
  await Message.updateOne(
    { _id: new Types.ObjectId(messageId) },
    { $addToSet: { readBy: new Types.ObjectId(userId) } }
  );

  // Get team name if applicable
  let teamName: string | undefined;
  if (message.teamId) {
    const team = await Team.findById(message.teamId).lean();
    teamName = team?.name;
  }

  // For the message author or admins: return full ack list
  // For recipients: return only their own ack status
  const isAuthor = message.authorId.toString() === userId;
  const role = session.user.role;
  const isAdmin = role === "org_owner" || role === "org_admin" || role === "head_coach";

  let acks: unknown[] = [];
  let userAck: unknown = null;

  if (isAuthor || isAdmin) {
    acks = await MessageAck.find({
      messageId: new Types.ObjectId(messageId),
    })
      .sort({ respondedAt: -1 })
      .lean();
  } else {
    userAck = await MessageAck.findOne({
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
    }).lean();
  }

  return NextResponse.json({
    message: {
      ...message,
      teamName,
      isRead: true,
    },
    acks: isAuthor || isAdmin ? acks : undefined,
    userAck,
    recipientCount: message.recipientUserIds?.length || 0,
    ackCount: acks.length,
  });
}

// PATCH /api/messages/[messageId] — update message (pin, etc.)
export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await context.params;
  if (!Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message } = getOrgModels(conn);

  const message = await Message.findById(messageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Only author or admin can update
  const userId = session.user.id;
  const isAuthor = message.authorId.toString() === userId;
  const role = session.user.role;
  const isAdmin = role === "org_owner" || role === "org_admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowedFields = ["pinned"];
  const update: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await Message.findByIdAndUpdate(messageId, update, {
    new: true,
  }).lean();

  return NextResponse.json({ message: updated });
}
