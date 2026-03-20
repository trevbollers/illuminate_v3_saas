import { NextRequest, NextResponse } from "next/server";
import { auth } from "@illuminate/auth/edge";
import { createBillingPortalSession } from "@illuminate/billing";
import { connectPlatformDB, Tenant } from "@illuminate/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
    .select("plan.stripeCustomerId")
    .lean();

  if (!tenant?.plan?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Complete a checkout first." },
      { status: 400 }
    );
  }

  const returnUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL
      ? `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/settings/billing`
      : `${req.headers.get("origin") ?? "http://localhost:3002"}/settings/billing`;

  try {
    const portalSession = await createBillingPortalSession({
      stripeCustomerId: tenant.plan.stripeCustomerId,
      returnUrl,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[billing/portal] Failed to create portal session:", err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
