export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectPlatformDB, Tenant, connectTenantDB, getLeagueModels, getOrgModels } from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";
import type Stripe from "stripe";

// POST /api/webhooks/stripe — handle Stripe webhook events for registration payments
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Determine which tenant this webhook belongs to
  // Option 1: tenant slug in query param (set when configuring webhook URL)
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get("tenant");

  if (!tenantSlug) {
    return NextResponse.json(
      { error: "Missing tenant query parameter. Webhook URL should be: /api/webhooks/stripe?tenant=your-league-slug" },
      { status: 400 },
    );
  }

  // Get the tenant's Stripe config
  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenantSlug }).lean();
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stripeConfig = getTenantStripeConfig((tenantDoc as any).settings);

  if (!stripeConfig) {
    return NextResponse.json({ error: "Stripe not configured for this tenant" }, { status: 400 });
  }

  // Use the TENANT'S Stripe keys — never the platform's
  const stripe = getTenantStripe(stripeConfig.secretKey, tenantSlug);

  // Verify webhook signature if webhook secret is configured
  let event: Stripe.Event;
  if (stripeConfig.webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeConfig.webhookSecret);
    } catch (err: any) {
      console.error("[webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // No webhook secret configured — parse event directly (less secure, but functional)
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  // Connect to the tenant's league DB
  const conn = await connectTenantDB(tenantSlug, "league");
  const models = getLeagueModels(conn);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const stripeSession = event.data.object as Stripe.Checkout.Session;

        // Support both single (registrationId) and multi (registrationIds) formats
        const registrationIdsRaw =
          stripeSession.metadata?.registrationIds ||
          stripeSession.metadata?.registrationId;

        if (!registrationIdsRaw) {
          return NextResponse.json({ received: true, message: "No registrationId(s) in metadata" });
        }

        const regIds = registrationIdsRaw.split(",").filter(Boolean);
        const perRegAmount = regIds.length > 0
          ? Math.round((stripeSession.amount_total || 0) / regIds.length)
          : 0;

        for (const regId of regIds) {
          await models.Registration.findByIdAndUpdate(regId, {
            $set: {
              paymentStatus: "paid",
              amountPaid: perRegAmount,
              stripePaymentIntentId: stripeSession.payment_intent?.toString() || stripeSession.id,
            },
          });

          // Auto-approve pending registrations on payment
          const reg = await models.Registration.findById(regId).lean();
          if (reg && (reg as any).status === "pending") {
            await models.Registration.findByIdAndUpdate(regId, {
              $set: { status: "approved" },
            });
          }
        }

        console.log(`[webhook] ${regIds.length} registration(s) paid — total: ${stripeSession.amount_total}`);

        // Update the org's cart checkout status if cartId is present
        const cartId = stripeSession.metadata?.cartId;
        const orgTenantSlug = stripeSession.metadata?.orgTenantSlug;
        if (cartId && orgTenantSlug) {
          try {
            const orgConn = await connectTenantDB(orgTenantSlug, "organization");
            const orgModels = getOrgModels(orgConn);
            await orgModels.RegistrationCart.updateOne(
              {
                _id: new Types.ObjectId(cartId),
                "checkouts.leagueSlug": tenantSlug,
              },
              {
                $set: {
                  "checkouts.$.status": "paid",
                  "checkouts.$.paidAt": new Date(),
                },
              },
            );

            // Check if all checkouts are now paid — if so, mark cart completed
            const cart = await orgModels.RegistrationCart.findById(cartId).lean();
            if (cart && (cart as any).checkouts.every((c: any) => c.status === "paid")) {
              await orgModels.RegistrationCart.findByIdAndUpdate(cartId, {
                $set: { status: "completed" },
              });
            }
          } catch (err) {
            console.error("[webhook] Failed to update org cart:", err);
          }
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const registrationId = session.metadata?.registrationId;
        if (registrationId) {
          // Mark payment as failed/expired — registration stays pending
          console.log(`[webhook] Checkout expired for registration ${registrationId}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent?.toString();
        if (paymentIntent) {
          await models.Registration.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent },
            { $set: { paymentStatus: "refunded" } },
          );
          console.log(`[webhook] Refund processed for payment ${paymentIntent}`);
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error("[webhook] Error processing event:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
