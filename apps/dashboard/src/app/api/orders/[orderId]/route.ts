export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// GET /api/orders/[orderId] — get single order details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { StorefrontOrder } = getOrgModels(conn);

  const order = await StorefrontOrder.findById(orderId).lean();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

// PATCH /api/orders/[orderId] — update fulfillment status, notes, tracking
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const { fulfillmentStatus, trackingNumber, notes } = body;

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { StorefrontOrder } = getOrgModels(conn);

  const order = await StorefrontOrder.findById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const update: any = {};
  if (fulfillmentStatus) {
    const validStatuses = ["pending", "processing", "shipped", "delivered", "picked_up"];
    if (!validStatuses.includes(fulfillmentStatus)) {
      return NextResponse.json({ error: "Invalid fulfillment status" }, { status: 400 });
    }
    update["fulfillment.status"] = fulfillmentStatus;
  }
  if (trackingNumber !== undefined) update["fulfillment.trackingNumber"] = trackingNumber;
  if (notes !== undefined) update.notes = notes;

  const updated = await StorefrontOrder.findByIdAndUpdate(orderId, update, { new: true }).lean();
  return NextResponse.json(updated);
}
