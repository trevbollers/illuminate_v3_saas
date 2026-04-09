export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

async function getTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-tenant-slug");
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••";
  return key.slice(0, 7) + "••••" + key.slice(-4);
}

export async function GET(): Promise<NextResponse> {
  const tenantSlug = await getTenantSlug();
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug }).select("settings.payments").lean();
  if (!tenantDoc) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const payments = (tenantDoc as any).settings?.payments || { defaultProvider: "stripe", providers: [] };

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

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const tenantSlug = await getTenantSlug();
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, config } = body;
  if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });

  const validProviders = ["stripe", "paypal", "square", "zelle", "cash_check"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  if (!tenantDoc.settings.payments) {
    (tenantDoc.settings as any).payments = { defaultProvider: "stripe", providers: [] };
  }

  const payments = (tenantDoc.settings as any).payments;
  const existingIdx = payments.providers.findIndex((p: any) => p.provider === provider);

  const pc: any = { provider, enabled: config.enabled ?? true, mode: config.mode || "own_keys" };

  if (provider === "stripe") {
    if (config.stripePublishableKey) pc.stripePublishableKey = config.stripePublishableKey;
    if (config.stripeSecretKey && !config.stripeSecretKey.includes("••••")) pc.stripeSecretKey = config.stripeSecretKey;
    else if (existingIdx >= 0) pc.stripeSecretKey = payments.providers[existingIdx].stripeSecretKey;
    if (config.stripeWebhookSecret && !config.stripeWebhookSecret.includes("••••")) pc.stripeWebhookSecret = config.stripeWebhookSecret;
    else if (existingIdx >= 0) pc.stripeWebhookSecret = payments.providers[existingIdx].stripeWebhookSecret;
    if (config.stripeConnectAccountId) pc.stripeConnectAccountId = config.stripeConnectAccountId;
    if (config.stripeConnectOnboardingComplete !== undefined) pc.stripeConnectOnboardingComplete = config.stripeConnectOnboardingComplete;
  }
  if (provider === "paypal") {
    if (config.paypalClientId) pc.paypalClientId = config.paypalClientId;
    if (config.paypalClientSecret && !config.paypalClientSecret.includes("••••")) pc.paypalClientSecret = config.paypalClientSecret;
    else if (existingIdx >= 0) pc.paypalClientSecret = payments.providers[existingIdx].paypalClientSecret;
    pc.paypalMode = config.paypalMode || "sandbox";
  }
  if (provider === "square") {
    if (config.squareAccessToken && !config.squareAccessToken.includes("••••")) pc.squareAccessToken = config.squareAccessToken;
    else if (existingIdx >= 0) pc.squareAccessToken = payments.providers[existingIdx].squareAccessToken;
    if (config.squareLocationId) pc.squareLocationId = config.squareLocationId;
    pc.squareEnvironment = config.squareEnvironment || "sandbox";
  }
  if (provider === "zelle") { pc.zelleEmail = config.zelleEmail || ""; pc.zellePhone = config.zellePhone || ""; pc.zelleDisplayName = config.zelleDisplayName || ""; }
  if (provider === "cash_check") { pc.cashCheckInstructions = config.cashCheckInstructions || ""; }

  pc.connectedAt = pc.connectedAt || new Date();
  if (existingIdx >= 0) payments.providers[existingIdx] = pc;
  else payments.providers.push(pc);

  tenantDoc.markModified("settings.payments");
  await tenantDoc.save();
  return NextResponse.json({ success: true, provider });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const tenantSlug = await getTenantSlug();
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = new URL(req.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "Provider query param required" }, { status: 400 });

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const payments = (tenantDoc.settings as any).payments;
  if (payments?.providers) {
    payments.providers = payments.providers.filter((p: any) => p.provider !== provider);
    if (payments.defaultProvider === provider) payments.defaultProvider = "stripe";
    tenantDoc.markModified("settings.payments");
    await tenantDoc.save();
  }

  return NextResponse.json({ success: true });
}
