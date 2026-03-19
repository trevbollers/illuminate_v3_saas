import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@illuminate/billing/src/stripe";

// Disable body parsing - Stripe needs the raw body for signature verification
export const runtime = "nodejs";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("No request body");

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { tenantId, userId, planId } = session.metadata || {};

        console.log(
          `Checkout completed: tenant=${tenantId}, user=${userId}, plan=${planId}`
        );

        // TODO: Activate the tenant subscription in the database
        // await db.tenant.update(tenantId, {
        //   stripeCustomerId: session.customer,
        //   stripeSubscriptionId: session.subscription,
        //   plan: planId,
        //   status: "active",
        // });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { tenantId } = subscription.metadata || {};

        console.log(
          `Subscription updated: tenant=${tenantId}, status=${subscription.status}`
        );

        // TODO: Update subscription status in the database
        // await db.tenant.update(tenantId, {
        //   subscriptionStatus: subscription.status,
        //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        // });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { tenantId } = subscription.metadata || {};

        console.log(`Subscription cancelled: tenant=${tenantId}`);

        // TODO: Deactivate tenant in the database
        // await db.tenant.update(tenantId, {
        //   subscriptionStatus: "cancelled",
        //   plan: "free",
        // });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        console.log(
          `Payment failed for subscription: ${subscriptionId}`
        );

        // TODO: Notify tenant of payment failure
        // TODO: Update payment status in database

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice: ${invoice.id}`);

        // TODO: Record successful payment in database
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
