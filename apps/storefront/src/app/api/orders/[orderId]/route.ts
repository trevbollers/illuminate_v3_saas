export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import { getTenantSlug } from "@/lib/get-tenant-slug";

// GET /api/orders/[orderId] — order confirmation/detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse> {
  const slug = await getTenantSlug();
  if (!slug) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { orderId } = await params;

  const conn = await connectTenantDB(slug, "organization");
  const { StorefrontOrder } = getOrgModels(conn);

  const order = await StorefrontOrder.findById(orderId).lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
