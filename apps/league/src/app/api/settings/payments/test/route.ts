export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { getLeagueTenant } from "@/lib/tenant-db";
import { getTenantStripe } from "@goparticipate/billing";

// POST /api/settings/payments/test — test a payment provider connection
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider } = body;

  if (!provider) {
    return NextResponse.json({ error: "Provider is required" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenant.tenantSlug });
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const payments = (tenantDoc.settings as any).payments;
  const providerConfig = payments?.providers?.find(
    (p: any) => p.provider === provider,
  );

  if (!providerConfig) {
    return NextResponse.json(
      { error: "Provider not configured. Save your settings first." },
      { status: 400 },
    );
  }

  try {
    if (provider === "stripe") {
      return await testStripeConnection(providerConfig, tenantDoc);
    }

    if (provider === "paypal") {
      return await testPayPalConnection(providerConfig, tenantDoc);
    }

    if (provider === "square") {
      return NextResponse.json({
        success: true,
        message: "Square integration test not yet implemented.",
      });
    }

    // Zelle, cash_check — no API to test
    return NextResponse.json({
      success: true,
      message: `${provider} does not require a connection test.`,
    });
  } catch (err: any) {
    // Update test status to failed
    const idx = payments.providers.findIndex((p: any) => p.provider === provider);
    if (idx >= 0) {
      payments.providers[idx].lastTestedAt = new Date();
      payments.providers[idx].testStatus = "failed";
      tenantDoc.markModified("settings.payments");
      await tenantDoc.save();
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Connection test failed",
      },
      { status: 400 },
    );
  }
}

async function testStripeConnection(
  config: any,
  tenantDoc: any,
): Promise<NextResponse> {
  if (!config.stripeSecretKey) {
    return NextResponse.json(
      { success: false, error: "Stripe secret key not configured" },
      { status: 400 },
    );
  }

  const stripe = getTenantStripe(config.stripeSecretKey, (tenantDoc as any).slug);

  // Simple test: retrieve account info
  const account = await stripe.accounts.retrieve();

  // Update test status
  const payments = (tenantDoc.settings as any).payments;
  const idx = payments.providers.findIndex((p: any) => p.provider === "stripe");
  if (idx >= 0) {
    payments.providers[idx].lastTestedAt = new Date();
    payments.providers[idx].testStatus = "success";
    tenantDoc.markModified("settings.payments");
    await tenantDoc.save();
  }

  return NextResponse.json({
    success: true,
    message: `Connected to Stripe account: ${account.settings?.dashboard?.display_name || account.id}`,
    accountId: account.id,
    businessName: account.settings?.dashboard?.display_name || account.business_profile?.name,
  });
}

async function testPayPalConnection(
  config: any,
  tenantDoc: any,
): Promise<NextResponse> {
  if (!config.paypalClientId || !config.paypalClientSecret) {
    return NextResponse.json(
      { success: false, error: "PayPal client ID and secret are required" },
      { status: 400 },
    );
  }

  const baseUrl =
    config.paypalMode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  // Get OAuth token to verify credentials
  const authString = Buffer.from(
    `${config.paypalClientId}:${config.paypalClientSecret}`,
  ).toString("base64");

  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    throw new Error("PayPal authentication failed. Check your Client ID and Secret.");
  }

  const tokenData = await tokenRes.json();

  // Update test status
  const payments = (tenantDoc.settings as any).payments;
  const idx = payments.providers.findIndex((p: any) => p.provider === "paypal");
  if (idx >= 0) {
    payments.providers[idx].lastTestedAt = new Date();
    payments.providers[idx].testStatus = "success";
    tenantDoc.markModified("settings.payments");
    await tenantDoc.save();
  }

  return NextResponse.json({
    success: true,
    message: `PayPal connection verified (${config.paypalMode} mode)`,
    scope: tokenData.scope,
  });
}
