export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { auth } from "@goparticipate/auth/edge";

async function getAuthenticatedTenantSlug(): Promise<string | null> {
  const session = await auth();
  return session?.user?.tenantSlug || null;
}

// GET /api/settings/payments — get payment provider settings for this org
export async function GET(): Promise<NextResponse> {
  const tenantSlug = await getAuthenticatedTenantSlug();
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug })
    .select("settings.payments")
    .lean();

  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const payments = (tenantDoc as any).settings?.payments || {
    defaultProvider: "stripe",
    providers: [],
  };

  // Mask secret keys before sending to client
  const maskedProviders = (payments.providers || []).map((p: any) => ({
    ...p,
    stripeSecretKey: p.stripeSecretKey ? maskKey(p.stripeSecretKey) : undefined,
    stripeWebhookSecret: p.stripeWebhookSecret ? maskKey(p.stripeWebhookSecret) : undefined,
    paypalClientSecret: p.paypalClientSecret ? maskKey(p.paypalClientSecret) : undefined,
    squareAccessToken: p.squareAccessToken ? maskKey(p.squareAccessToken) : undefined,
  }));

  return NextResponse.json({
    defaultProvider: payments.defaultProvider || "stripe",
    providers: maskedProviders,
    platformFeePercent: payments.platformFeePercent,
  });
}

// PUT /api/settings/payments — update payment provider config
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const tenantSlug = await getAuthenticatedTenantSlug();
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, config } = body;

  if (!provider) {
    return NextResponse.json({ error: "Provider is required" }, { status: 400 });
  }

  const validProviders = ["stripe", "paypal", "square", "zelle", "cash_check"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenantDoc.settings.payments) {
    (tenantDoc.settings as any).payments = {
      defaultProvider: "stripe",
      providers: [],
    };
  }

  const payments = (tenantDoc.settings as any).payments;
  const existingIdx = payments.providers.findIndex(
    (p: any) => p.provider === provider,
  );

  const providerConfig: any = {
    provider,
    enabled: config.enabled ?? true,
    mode: config.mode || "own_keys",
  };

  if (provider === "stripe") {
    if (config.stripePublishableKey) providerConfig.stripePublishableKey = config.stripePublishableKey;
    if (config.stripeSecretKey && !config.stripeSecretKey.includes("••••")) {
      providerConfig.stripeSecretKey = config.stripeSecretKey;
    } else if (existingIdx >= 0) {
      providerConfig.stripeSecretKey = payments.providers[existingIdx].stripeSecretKey;
    }
    if (config.stripeWebhookSecret && !config.stripeWebhookSecret.includes("••••")) {
      providerConfig.stripeWebhookSecret = config.stripeWebhookSecret;
    } else if (existingIdx >= 0) {
      providerConfig.stripeWebhookSecret = payments.providers[existingIdx].stripeWebhookSecret;
    }
    if (config.stripeConnectAccountId) providerConfig.stripeConnectAccountId = config.stripeConnectAccountId;
    if (config.stripeConnectOnboardingComplete !== undefined) {
      providerConfig.stripeConnectOnboardingComplete = config.stripeConnectOnboardingComplete;
    }
  }

  if (provider === "paypal") {
    if (config.paypalClientId) providerConfig.paypalClientId = config.paypalClientId;
    if (config.paypalClientSecret && !config.paypalClientSecret.includes("••••")) {
      providerConfig.paypalClientSecret = config.paypalClientSecret;
    } else if (existingIdx >= 0) {
      providerConfig.paypalClientSecret = payments.providers[existingIdx].paypalClientSecret;
    }
    providerConfig.paypalMode = config.paypalMode || "sandbox";
  }

  if (provider === "square") {
    if (config.squareAccessToken && !config.squareAccessToken.includes("••••")) {
      providerConfig.squareAccessToken = config.squareAccessToken;
    } else if (existingIdx >= 0) {
      providerConfig.squareAccessToken = payments.providers[existingIdx].squareAccessToken;
    }
    if (config.squareLocationId) providerConfig.squareLocationId = config.squareLocationId;
    providerConfig.squareEnvironment = config.squareEnvironment || "sandbox";
  }

  if (provider === "zelle") {
    providerConfig.zelleEmail = config.zelleEmail || "";
    providerConfig.zellePhone = config.zellePhone || "";
    providerConfig.zelleDisplayName = config.zelleDisplayName || "";
  }

  if (provider === "cash_check") {
    providerConfig.cashCheckInstructions = config.cashCheckInstructions || "";
  }

  providerConfig.connectedAt = providerConfig.connectedAt || new Date();

  if (existingIdx >= 0) {
    payments.providers[existingIdx] = providerConfig;
  } else {
    payments.providers.push(providerConfig);
  }

  tenantDoc.markModified("settings.payments");
  await tenantDoc.save();

  return NextResponse.json({ success: true, provider });
}

// DELETE /api/settings/payments — remove a payment provider
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const tenantSlug = await getAuthenticatedTenantSlug();
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.json({ error: "Provider query param required" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const payments = (tenantDoc.settings as any).payments;
  if (payments?.providers) {
    payments.providers = payments.providers.filter(
      (p: any) => p.provider !== provider,
    );
    if (payments.defaultProvider === provider) {
      payments.defaultProvider = "stripe";
    }
    tenantDoc.markModified("settings.payments");
    await tenantDoc.save();
  }

  return NextResponse.json({ success: true });
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••";
  return key.slice(0, 7) + "••••" + key.slice(-4);
}
