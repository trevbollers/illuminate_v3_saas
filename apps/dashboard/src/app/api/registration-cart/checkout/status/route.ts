export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// GET /api/registration-cart/checkout/status — check payment status after returning from Stripe
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const tenantId = h.get("x-tenant-id");
  if (!tenantSlug || !userId || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  // Find the most recent checking_out or completed cart
  const cart = await models.RegistrationCart.findOne({
    orgTenantId: new Types.ObjectId(tenantId),
    status: { $in: ["checking_out", "completed"] },
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!cart) {
    return NextResponse.json({ error: "No checkout found" }, { status: 404 });
  }

  const allPaid = (cart as any).checkouts.every((c: any) => c.status === "paid");
  const unpaidLeagues = (cart as any).checkouts
    .filter((c: any) => c.status !== "paid")
    .map((c: any) => ({
      leagueSlug: c.leagueSlug,
      amountCents: c.amountCents,
      status: c.status,
    }));

  // If all paid and cart is still checking_out, mark complete
  if (allPaid && (cart as any).status === "checking_out") {
    await models.RegistrationCart.findByIdAndUpdate((cart as any)._id, {
      $set: { status: "completed" },
    });
  }

  return NextResponse.json({
    cartId: (cart as any)._id,
    status: allPaid ? "completed" : "checking_out",
    checkouts: (cart as any).checkouts,
    allPaid,
    unpaidLeagues,
  });
}
