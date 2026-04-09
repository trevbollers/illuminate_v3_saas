export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// DELETE /api/registration-cart/items/[itemId] — remove an item from the cart
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const tenantId = h.get("x-tenant-id");
  if (!tenantSlug || !userId || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const cart = await models.RegistrationCart.findOne({
    orgTenantId: new Types.ObjectId(tenantId),
    status: "active",
  });

  if (!cart) {
    return NextResponse.json({ error: "No active cart" }, { status: 404 });
  }

  const itemIndex = cart.items.findIndex(
    (i: any) => i._id.toString() === itemId,
  );
  if (itemIndex === -1) {
    return NextResponse.json({ error: "Item not found in cart" }, { status: 404 });
  }

  cart.items.splice(itemIndex, 1);

  // If cart is now empty, mark as abandoned
  if (cart.items.length === 0) {
    cart.status = "abandoned";
  }

  await cart.save();

  return NextResponse.json({
    message: "Item removed from cart",
    itemCount: cart.items.length,
  });
}
