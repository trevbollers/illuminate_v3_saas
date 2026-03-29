export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import { getTenantSlug } from "@/lib/get-tenant-slug";

// GET /api/products — public product catalog for this org's storefront
export async function GET(req: NextRequest): Promise<NextResponse> {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { Product } = getOrgModels(conn);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;

  const products = await Product.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select("-createdBy")
    .lean();

  return NextResponse.json({ products });
}
