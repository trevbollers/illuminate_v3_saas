import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createBillingPortalSession } from "@goparticipate/billing";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      : `${req.headers.get("origin") ?? "http://localhost:4003"}/settings/billing`;

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
