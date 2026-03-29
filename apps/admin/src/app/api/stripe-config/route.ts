export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { stripe } from "@goparticipate/billing";
import { connectPlatformDB, Plan } from "@goparticipate/db";
import { requireAdmin } from "@/lib/require-admin";

function maskKey(key: string | undefined): string {
  if (!key) return "Not configured";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "••••••••••••" + key.slice(-4);
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  const mode = secretKey?.startsWith("sk_live_")
    ? "live"
    : secretKey?.startsWith("sk_test_")
    ? "test"
    : "unknown";

  // Probe Stripe connection
  let connected = false;
  let accountId: string | null = null;
  let accountName: string | null = null;
  let chargesEnabled = false;
  let payoutsEnabled = false;
  let connectionError: string | null = null;

  if (secretKey) {
    try {
      const balance = await stripe.balance.retrieve();
      connected = !!balance;

      // Try to get account details
      try {
        const account = await stripe.accounts.retrieve();
        accountId = account.id;
        accountName = account.business_profile?.name ?? account.email ?? account.id;
        chargesEnabled = account.charges_enabled ?? false;
        payoutsEnabled = account.payouts_enabled ?? false;
      } catch {
        // Connected account may not be a platform account — still connected
        accountId = "standard_account";
        chargesEnabled = true;
      }
    } catch (err) {
      connectionError =
        err instanceof Error ? err.message : "Failed to connect to Stripe";
    }
  } else {
    connectionError = "STRIPE_SECRET_KEY is not configured";
  }

  // Plan sync stats
  let planCount = 0;
  let lastSyncAt: Date | null = null;
  try {
    await connectPlatformDB();
    const plans = await Plan.find().select("updatedAt").lean();
    planCount = plans.length;
    if (plans.length > 0) {
      lastSyncAt = plans.reduce((latest, p) => {
        const t = p.updatedAt as Date;
        return t > latest ? t : latest;
      }, plans[0]!.updatedAt as Date);
    }
  } catch {
    // Non-critical
  }

  // Webhook events we handle
  const handledEvents = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ];

  return NextResponse.json({
    connected,
    connectionError,
    mode,
    accountId,
    accountName,
    chargesEnabled,
    payoutsEnabled,
    keys: {
      secretKey: maskKey(secretKey),
      publishableKey: maskKey(publishableKey),
      webhookSecret: maskKey(webhookSecret),
      secretKeyConfigured: !!secretKey,
      publishableKeyConfigured: !!publishableKey,
      webhookSecretConfigured: !!webhookSecret,
    },
    webhook: {
      url: `${appUrl}/api/billing/webhook`,
      handledEvents,
    },
    sync: {
      planCount,
      lastSyncAt,
    },
  });
}
