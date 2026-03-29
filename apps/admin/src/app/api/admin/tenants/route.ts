export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectPlatformDB, Tenant, User } from "@goparticipate/db";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectPlatformDB();

  const tenants = await Tenant.find()
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate member counts per tenant from the users collection
  const memberCounts = await User.aggregate([
    { $unwind: "$memberships" },
    { $match: { "memberships.isActive": true } },
    {
      $group: {
        _id: "$memberships.tenantId",
        count: { $sum: 1 },
      },
    },
  ]);
  const memberCountMap = new Map<string, number>(
    memberCounts.map((mc) => [mc._id.toString(), mc.count])
  );

  const rows = tenants.map((t) => ({
    id: (t._id as mongoose.Types.ObjectId).toString(),
    businessName: t.name,
    slug: t.slug,
    owner: (t.owner as any)?.name ?? "—",
    ownerEmail: (t.owner as any)?.email ?? "—",
    plan: t.plan.planId,
    status: t.plan.status,
    tenantStatus: t.status,
    users: memberCountMap.get((t._id as mongoose.Types.ObjectId).toString()) ?? 1,
    created: new Date(t.createdAt as Date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return NextResponse.json(rows);
}
