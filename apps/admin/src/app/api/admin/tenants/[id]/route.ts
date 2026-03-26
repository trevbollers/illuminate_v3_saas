export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant, User, Plan } from "@goparticipate/db";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
  }

  await connectPlatformDB();

  const [tenant, plan] = await Promise.all([
    Tenant.findById(id).populate("owner", "name email").lean(),
    // Plan fetched after tenant is loaded below
    null,
  ]);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const planDoc = await Plan.findOne({ planId: tenant.plan.planId }).lean();

  // Get all users who are members of this tenant
  const members = await User.find({
    memberships: {
      $elemMatch: {
        tenantId: tenant._id,
        isActive: true,
      },
    },
  })
    .select("name email memberships lastLoginAt")
    .lean();

  const memberRows = members.map((u) => {
    const membership = u.memberships.find(
      (m: any) => m.tenantId.toString() === (tenant._id as mongoose.Types.ObjectId).toString()
    );
    return {
      name: u.name,
      email: u.email,
      role: membership?.role ?? "staff",
      lastActive: u.lastLoginAt
        ? new Date(u.lastLoginAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Never",
    };
  });

  const mrr = (planDoc?.pricing?.monthly ?? 0) / 100;

  return NextResponse.json({
    id: (tenant._id as mongoose.Types.ObjectId).toString(),
    businessName: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    createdAt: new Date(tenant.createdAt as Date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    plan: planDoc?.name ?? tenant.plan.planId,
    planId: tenant.plan.planId,
    subscriptionStatus: tenant.plan.status,
    renewalDate: tenant.plan.currentPeriodEnd
      ? new Date(tenant.plan.currentPeriodEnd).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null,
    trialEnd: tenant.plan.trialEnd
      ? new Date(tenant.plan.trialEnd).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null,
    mrr,
    limits: planDoc?.limits ?? null,
    usage: {
      users: memberRows.length,
      maxUsers: planDoc?.limits?.users ?? 0,
      teams: 0,
      maxTeams: planDoc?.limits?.teams ?? 0,
    },
    members: memberRows,
  });
}
