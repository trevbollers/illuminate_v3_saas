export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json();
  const validProviders = ["stripe", "paypal", "square", "zelle", "cash_check"];
  if (!provider || !validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug });
  if (!tenantDoc) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const payments = (tenantDoc.settings as any).payments;
  const pc = payments?.providers?.find((p: any) => p.provider === provider && p.enabled);
  if (!pc) return NextResponse.json({ error: "Provider must be configured and enabled first" }, { status: 400 });

  if (!payments) (tenantDoc.settings as any).payments = { defaultProvider: provider, providers: [] };
  else payments.defaultProvider = provider;

  tenantDoc.markModified("settings.payments");
  await tenantDoc.save();
  return NextResponse.json({ success: true, defaultProvider: provider });
}
