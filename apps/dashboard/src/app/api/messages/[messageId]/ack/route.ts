export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, connectPlatformDB, getOrgModels } from "@goparticipate/db";

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

// POST /api/messages/[messageId]/ack — acknowledge a message
export async function POST(
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

  const body = await req.json();
  const { response } = body;

  if (!response) {
    return NextResponse.json(
      { error: "response is required" },
      { status: 400 }
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message, MessageAck } = getOrgModels(conn);

  const message = await Message.findById(messageId).lean();
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (!message.requiresAck) {
    return NextResponse.json(
      { error: "This message does not require acknowledgement" },
      { status: 400 }
    );
  }

  // Validate response is one of the allowed options
  if (!message.ackOptions.includes(response)) {
    return NextResponse.json(
      {
        error: `Invalid response. Must be one of: ${message.ackOptions.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Get user name from platform DB
  const platformDb = await connectPlatformDB();
  const User = platformDb.model("User");
  const user = await User.findById(userId).lean() as { name: string } | null;

  // Upsert — allows changing response
  const ack = await MessageAck.findOneAndUpdate(
    {
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
    },
    {
      messageId: new Types.ObjectId(messageId),
      userId: new Types.ObjectId(userId),
      userName: user?.name || session.user.name || "Unknown",
      response,
      respondedAt: new Date(),
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ ack }, { status: 201 });
}
