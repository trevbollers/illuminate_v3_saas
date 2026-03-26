export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { auth } from "@goparticipate/auth/edge";

// PUT /api/settings/payments/default — set default payment provider
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider } = body;

  const validProviders = ["stripe", "paypal", "square", "zelle", "cash_check"];
  if (!provider || !validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: session.user.tenantSlug });
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

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
