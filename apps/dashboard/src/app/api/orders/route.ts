export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// GET /api/orders — list storefront orders for this org
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { StorefrontOrder } = getOrgModels(conn);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const status = url.searchParams.get("status");
  const fulfillment = url.searchParams.get("fulfillment");
  const search = url.searchParams.get("search")?.trim();

  const filter: any = {};
  if (status) filter.paymentStatus = status;
  if (fulfillment) filter["fulfillment.status"] = fulfillment;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "customer.firstName": { $regex: search, $options: "i" } },
      { "customer.lastName": { $regex: search, $options: "i" } },
      { "customer.email": { $regex: search, $options: "i" } },
    ];
  }

  const [orders, total] = await Promise.all([
    StorefrontOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    StorefrontOrder.countDocuments(filter),
  ]);

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
