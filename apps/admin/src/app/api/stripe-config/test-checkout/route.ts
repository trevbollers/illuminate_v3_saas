import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@illuminate/billing";
import { connectPlatformDB, Plan } from "@illuminate/db";

export async function POST(req: NextRequest) {
  const { planId, billingInterval = "monthly" } = await req.json();

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  if (billingInterval !== "monthly" && billingInterval !== "yearly") {
    return NextResponse.json({ error: "Invalid billingInterval" }, { status: 400 });
  }

  await connectPlatformDB();
  const plan = await Plan.findOne({ planId, isActive: true }).lean();
  if (!plan) {
    return NextResponse.json({ error: `Plan "${planId}" not found` }, { status: 404 });
  }

  const priceId =
    billingInterval === "monthly"
      ? plan.pricing.stripePriceIdMonthly
      : plan.pricing.stripePriceIdAnnual;

  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price ID configured for ${planId} / ${billingInterval}. Run a product sync first.` },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  try {
    const session = await createCheckoutSession({
      planId,
      billingInterval,
      tenantId: "test_tenant_admin",
      userId: "test_user_admin",
      email: "test@illuminate-admin.dev",
      successUrl: `${adminUrl}/stripe?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${adminUrl}/stripe?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
