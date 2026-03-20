import { NextRequest, NextResponse } from "next/server";
import { auth } from "@illuminate/auth";
import { createCheckoutSession } from "@illuminate/billing/src/checkout";
import { getPlan } from "@illuminate/billing/src/plans";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, billingInterval = "monthly" } = body;

    const plan = planId ? await getPlan(planId) : null;
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    if (billingInterval !== "monthly" && billingInterval !== "yearly") {
      return NextResponse.json(
        { error: "Invalid billing interval" },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "";

    const checkoutSession = await createCheckoutSession({
      planId,
      billingInterval,
      tenantId: (session.user as any).tenantId || "",
      userId: session.user.id,
      email: session.user.email!,
      successUrl: `${origin}/dashboard?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
