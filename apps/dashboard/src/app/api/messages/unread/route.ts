export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// GET /api/messages/unread — get unread message counts by channel
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Message } = getOrgModels(conn);

  const userOid = new Types.ObjectId(userId);
  const isAdmin = role === "org_owner" || role === "org_admin" || role === "head_coach";

  const baseFilter: Record<string, unknown> = {
    readBy: { $ne: userOid },
  };

  if (!isAdmin) {
    baseFilter.recipientUserIds = userOid;
  }

  const counts = await Message.aggregate([
    { $match: baseFilter },
    { $group: { _id: "$channel", count: { $sum: 1 } } },
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
