export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { getTenantSlug } from "@/lib/get-tenant-slug";

// GET /api/config — public storefront config (tax rate, branding, etc.)
export async function GET(): Promise<NextResponse> {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug })
    .select("name settings.storefront settings.branding")
    .lean();

  if (!tenant) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const storefront = (tenant.settings as any)?.storefront;

  return NextResponse.json({
    storeName: (tenant.settings as any)?.branding?.displayName || tenant.name,
    taxRate: storefront?.taxRate ?? 0,
    taxLabel: storefront?.taxLabel ?? "Tax",
  });
}
