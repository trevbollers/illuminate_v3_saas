export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import { getTenantSlug } from "@/lib/get-tenant-slug";

// GET /api/products/[slug] — single product detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const tenantSlug = await getTenantSlug();
  if (!tenantSlug) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { slug } = await params;

  const conn = await connectTenantDB(tenantSlug, "organization");
  const { Product } = getOrgModels(conn);

  const product = await Product.findOne({ slug, isActive: true })
    .select("-createdBy")
    .lean();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
