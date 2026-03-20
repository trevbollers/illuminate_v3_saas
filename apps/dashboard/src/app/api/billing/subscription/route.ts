import { NextRequest, NextResponse } from "next/server";
import { auth } from "@illuminate/auth/edge";
import { connectPlatformDB, Tenant } from "@illuminate/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantSlug = session.user.tenantSlug;
  if (!tenantSlug) {
    return NextResponse.json({ error: "No active tenant" }, { status: 400 });
  }

  await connectPlatformDB();

  const tenant = await Tenant.findOne({ slug: tenantSlug })
    .select("plan")
    .lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    planId: tenant.plan.planId,
    status: tenant.plan.status,
    stripeCustomerId: tenant.plan.stripeCustomerId ?? null,
    stripeSubscriptionId: tenant.plan.stripeSubscriptionId ?? null,
    currentPeriodEnd: tenant.plan.currentPeriodEnd ?? null,
    trialEnd: tenant.plan.trialEnd ?? null,
    cancelAtPeriodEnd: tenant.plan.cancelAtPeriodEnd ?? false,
  });
}
