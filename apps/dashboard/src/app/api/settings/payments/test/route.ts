export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { getTenantStripe } from "@goparticipate/billing";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json();
  if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const payments = (tenantDoc.settings as any).payments;
  const pc = payments?.providers?.find((p: any) => p.provider === provider);
  if (!pc) return NextResponse.json({ error: "Provider not configured" }, { status: 400 });

  try {
    if (provider === "stripe") {
      if (!pc.stripeSecretKey) return NextResponse.json({ success: false, error: "Stripe secret key not configured" }, { status: 400 });
      const stripe = getTenantStripe(pc.stripeSecretKey, tenantSlug);
      const account = await stripe.accounts.retrieve();
      const idx = payments.providers.findIndex((p: any) => p.provider === "stripe");
      if (idx >= 0) { payments.providers[idx].lastTestedAt = new Date(); payments.providers[idx].testStatus = "success"; tenantDoc.markModified("settings.payments"); await tenantDoc.save(); }
      return NextResponse.json({ success: true, message: `Connected: ${account.settings?.dashboard?.display_name || account.id}`, accountId: account.id });
    }
    if (provider === "paypal") {
      if (!pc.paypalClientId || !pc.paypalClientSecret) return NextResponse.json({ success: false, error: "PayPal credentials required" }, { status: 400 });
      const baseUrl = pc.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${pc.paypalClientId}:${pc.paypalClientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      if (!tokenRes.ok) throw new Error("PayPal authentication failed");
      const idx = payments.providers.findIndex((p: any) => p.provider === "paypal");
      if (idx >= 0) { payments.providers[idx].lastTestedAt = new Date(); payments.providers[idx].testStatus = "success"; tenantDoc.markModified("settings.payments"); await tenantDoc.save(); }
      return NextResponse.json({ success: true, message: `PayPal verified (${pc.paypalMode} mode)` });
    }
    return NextResponse.json({ success: true, message: `${provider} does not require a connection test.` });
  } catch (err: any) {
    const idx = payments.providers.findIndex((p: any) => p.provider === provider);
    if (idx >= 0) { payments.providers[idx].lastTestedAt = new Date(); payments.providers[idx].testStatus = "failed"; tenantDoc.markModified("settings.payments"); await tenantDoc.save(); }
    return NextResponse.json({ success: false, error: err.message || "Connection test failed" }, { status: 400 });
  }
}
