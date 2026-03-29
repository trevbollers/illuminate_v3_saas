export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  connectTenantDB,
  connectPlatformDB,
  getOrgModels,
  Tenant,
} from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";
import { sendEmail, OrderConfirmationEmail } from "@goparticipate/email";

/**
 * POST /api/webhook/stripe — handle Stripe webhook events for storefront orders.
 *
 * Stripe sends checkout.session.completed when payment succeeds.
 * We verify the signature, find the order, and mark it as paid.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Parse the event to get the tenant slug from metadata
  // We need to parse first to find the tenant, then verify with their webhook secret
  let unverifiedEvent: any;
  try {
    unverifiedEvent = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const tenantSlug =
    unverifiedEvent?.data?.object?.metadata?.tenantSlug;

  if (!tenantSlug) {
    return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
  }

  // Get tenant Stripe config for webhook secret
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug })
    .select("name settings")
    .lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stripeConfig = getTenantStripeConfig(tenant.settings);
  if (!stripeConfig) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const stripe = getTenantStripe(stripeConfig.secretKey, tenantSlug);

  // Verify webhook signature
  let event;
  try {
    if (stripeConfig.webhookSecret) {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        stripeConfig.webhookSecret
      );
    } else {
      // No webhook secret configured — accept but log warning
      event = unverifiedEvent;
      console.warn(
        `[storefront:webhook] No webhook secret for tenant "${tenantSlug}" — processing unverified event`
      );
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const conn = await connectTenantDB(tenantSlug, "organization");
      const { StorefrontOrder } = getOrgModels(conn);

      const order = await StorefrontOrder.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "paid",
          stripePaymentIntentId: session.payment_intent,
          "fulfillment.status": "processing",
        },
        { new: true },
      ).lean();

      // Fire-and-forget order confirmation email
      if (order) {
        const baseUrl =
          process.env.NEXT_PUBLIC_STOREFRONT_URL ||
          `https://${tenantSlug}.goparticipate.com`;

        const formatDollars = (cents: number) =>
          `$${(cents / 100).toFixed(2)}`;

        sendEmail({
          to: (order as any).customer.email,
          subject: `Order Confirmed — ${(order as any).orderNumber}`,
          react: OrderConfirmationEmail({
            customerName: (order as any).customer.firstName,
            orderNumber: (order as any).orderNumber,
            items: (order as any).items.map((item: any) => ({
              name: item.productName,
              quantity: item.quantity,
              unitPrice: formatDollars(item.unitPrice),
              lineTotal: formatDollars(item.lineTotal),
              options: item.configOptions?.length
                ? item.configOptions
                    .map((o: any) => `${o.label}: ${o.value}`)
                    .join(", ")
                : undefined,
            })),
            subtotal: formatDollars((order as any).subtotal),
            tax: formatDollars((order as any).tax),
            total: formatDollars((order as any).total),
            fulfillmentMethod: (order as any).fulfillment.method,
            orderUrl: `${baseUrl}/orders/${(order as any)._id}`,
            storeName: tenant.name || tenantSlug,
          }),
        }).catch((err) =>
          console.error("[storefront:webhook] Failed to send order email:", err),
        );
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const conn = await connectTenantDB(tenantSlug, "organization");
      const { StorefrontOrder } = getOrgModels(conn);

      await StorefrontOrder.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
      });
    }
  }

  return NextResponse.json({ received: true });
}
