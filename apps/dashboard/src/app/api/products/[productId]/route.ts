export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// PATCH /api/products/[productId] — update a product
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.scopedRole || session.user.role;
  if (!role || !["org_owner", "org_admin", "head_coach"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { productId } = await params;
  const body = await req.json();

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Product } = getOrgModels(conn);

  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.category) updates.category = body.category;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl.trim() || undefined;
  if (body.pricing) {
    updates.pricing = {
      amount: body.pricing.amount ?? product.pricing.amount,
      type: body.pricing.type ?? product.pricing.type,
      interval: body.pricing.interval ?? product.pricing.interval,
      allowPartialPayment: body.pricing.allowPartialPayment ?? product.pricing.allowPartialPayment,
      installmentCount: body.pricing.installmentCount ?? product.pricing.installmentCount,
    };
  }
  if (body.options !== undefined) updates.options = body.options;
  if (body.teamIds !== undefined) {
    updates.teamIds = body.teamIds.map((id: string) => new Types.ObjectId(id));
  }
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const updated = await Product.findByIdAndUpdate(productId, updates, { new: true }).lean();

  return NextResponse.json({ product: updated });
}

// DELETE /api/products/[productId] — delete a product
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.scopedRole || session.user.role;
  if (!role || !["org_owner", "org_admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { productId } = await params;

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Product } = getOrgModels(conn);

  await Product.findByIdAndDelete(productId);

  return NextResponse.json({ success: true });
}
