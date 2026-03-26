export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { stripe } from "@goparticipate/billing";

export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: "STRIPE_SECRET_KEY is not set in environment variables." },
      { status: 400 }
    );
  }

  try {
    // Retrieve balance as a lightweight connectivity test
    const balance = await stripe.balance.retrieve();

    const mode = secretKey.startsWith("sk_live_") ? "live" : "test";
    const available = balance.available.map((b) => ({
      amount: (b.amount / 100).toFixed(2),
      currency: b.currency.toUpperCase(),
    }));

    // Attempt to get account info
    let accountName = "Stripe Account";
    let accountId = "";
    try {
      const account = await stripe.accounts.retrieve();
      accountName =
        account.business_profile?.name ?? account.email ?? account.id;
      accountId = account.id;
    } catch {
      // Standard (non-Connect) accounts don't expose this — that's fine
    }

    return NextResponse.json({
      success: true,
      mode,
      accountId,
      accountName,
      balance: available,
      message: `Successfully connected to Stripe in ${mode.toUpperCase()} mode.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Stripe error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
