export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { getLeagueTenant } from "@/lib/tenant-db";

// PUT /api/settings/payments/default — set default payment provider
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider } = body;

  const validProviders = ["stripe", "paypal", "square", "zelle", "cash_check"];
  if (!provider || !validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenant.tenantSlug });
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Verify provider is configured and enabled
  const payments = (tenantDoc.settings as any).payments;
  const providerConfig = payments?.providers?.find(
    (p: any) => p.provider === provider && p.enabled,
  );

  if (!providerConfig) {
    return NextResponse.json(
      { error: "Provider must be configured and enabled before setting as default" },
      { status: 400 },
    );
  }

  if (!payments) {
    (tenantDoc.settings as any).payments = { defaultProvider: provider, providers: [] };
  } else {
    payments.defaultProvider = provider;
  }

  tenantDoc.markModified("settings.payments");
  await tenantDoc.save();

  return NextResponse.json({ success: true, defaultProvider: provider });
}
