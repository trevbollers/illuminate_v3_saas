export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, connectPlatformDB, registerOrgModels, getOrgModels, User } from "@goparticipate/db";

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

// POST /api/messages/[messageId]/ack — acknowledge a message
export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await context.params;
  if (!Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
  }

  const body = await req.json();
  const { response } = body;

  if (!response) {
    return NextResponse.json({ error: "response is required" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Message, MessageAck } = getOrgModels(conn);

  const message = await Message.findById(messageId).lean();
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (!message.requiresAck) {
    return NextResponse.json({ error: "This message does not require acknowledgement" }, { status: 400 });
  }

  if (!message.ackOptions.includes(response)) {
    return NextResponse.json(
      { error: `Invalid response. Must be one of: ${message.ackOptions.join(", ")}` },
      { status: 400 },
    );
  }

  await connectPlatformDB();
  const user = await User.findById(userId).select("name").lean();

  const ack = await MessageAck.findOneAndUpdate(
    {
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
    },
    {
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
      userName: (user as any)?.name || "Unknown",
      response,
      respondedAt: new Date(),
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ ack }, { status: 201 });
}
