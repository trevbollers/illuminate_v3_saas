export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/messages/unread — get unread message counts by channel
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Message } = getOrgModels(conn);

  const userId = new Types.ObjectId(session.user.id);
  const role = session.user.role;
  const isAdmin = role === "org_owner" || role === "org_admin" || role === "head_coach";

  // Base filter: messages not read by this user
  const baseFilter: Record<string, unknown> = {
    readBy: { $ne: userId },
  };

  // Non-admins only see messages where they are a recipient
  if (!isAdmin) {
    baseFilter.recipientUserIds = userId;
  }

  const counts = await Message.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: "$channel",
        count: { $sum: 1 },
      },
    },
  ]);

  const channelCounts: Record<string, number> = {};
  let total = 0;

  for (const c of counts) {
    channelCounts[c._id] = c.count;
    total += c.count;
  }

  return NextResponse.json({
    all: total,
    team: channelCounts["team"] || 0,
    parents: channelCounts["parents"] || 0,
    coaches: channelCounts["coaches"] || 0,
    org: channelCounts["org"] || 0,
  });
}
