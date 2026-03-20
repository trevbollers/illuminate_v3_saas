import type Stripe from "stripe";
import { stripe } from "./stripe";
import { connectDB } from "@illuminate/db";
import mongoose from "mongoose";
import { getPlanByPriceId } from "./plans";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface WebhookResult {
  success: boolean;
  event: string;
  message: string;
}

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

export async function handleWebhookEvent(
  body: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<WebhookResult> {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown verification error";
    throw new Error(`Webhook signature verification failed: ${message}`);
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return {
      success: true,
      event: event.type,
      message: `Event "${event.type}" ignored — not relevant`,
    };
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );

    case "customer.subscription.updated":
      return handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription
      );

    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );

    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(
        event.data.object as Stripe.Invoice
      );

    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);

    default:
      return {
        success: true,
        event: event.type,
        message: "Unhandled event type",
      };
  }
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookResult> {
  const tenantId = session.metadata?.tenantId;
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!tenantId) {
    return {
      success: false,
      event: "checkout.session.completed",
      message: "Missing tenantId in session metadata",
    };
  }

  await updateTenant(tenantId, {
    "billing.stripeCustomerId": customerId ?? null,
    "billing.stripeSubscriptionId": subscriptionId ?? null,
    "billing.planId": planId ?? "starter",
    "billing.status": "trialing" as SubscriptionStatus,
    "billing.checkoutCompletedAt": new Date(),
    "billing.checkoutUserId": userId ?? null,
  });

  return {
    success: true,
    event: "checkout.session.completed",
    message: `Tenant "${tenantId}" subscribed to plan "${planId}"`,
  };
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    // Attempt to find tenant by stripeSubscriptionId
    const tenant = await findTenantBySubscription(subscription.id);
    if (!tenant) {
      return {
        success: false,
        event: "customer.subscription.updated",
        message: `No tenant found for subscription "${subscription.id}"`,
      };
    }
    return updateTenantSubscription(tenant._id.toString(), subscription);
  }

  return updateTenantSubscription(tenantId, subscription);
}

async function updateTenantSubscription(
  tenantId: string,
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const primaryItem = subscription.items.data[0];
  const priceId = primaryItem?.price?.id;
  const plan = priceId ? await getPlanByPriceId(priceId) : null;

  const updateFields: Record<string, unknown> = {
    "billing.status": subscription.status as SubscriptionStatus,
    "billing.currentPeriodStart": new Date(
      subscription.current_period_start * 1000
    ),
    "billing.currentPeriodEnd": new Date(
      subscription.current_period_end * 1000
    ),
    "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
  };

  if (plan) {
    updateFields["billing.planId"] = plan.planId;
  }

  if (subscription.trial_end) {
    updateFields["billing.trialEnd"] = new Date(
      subscription.trial_end * 1000
    );
  }

  await updateTenant(tenantId, updateFields);

  return {
    success: true,
    event: "customer.subscription.updated",
    message: `Tenant "${tenantId}" subscription updated — status: ${subscription.status}`,
  };
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<WebhookResult> {
  const tenantId = subscription.metadata?.tenantId;

  const resolvedTenantId =
    tenantId ??
    (await findTenantBySubscription(subscription.id))?._id?.toString();

  if (!resolvedTenantId) {
    return {
      success: false,
      event: "customer.subscription.deleted",
      message: `No tenant found for subscription "${subscription.id}"`,
    };
  }

  await updateTenant(resolvedTenantId, {
    "billing.status": "canceled" as SubscriptionStatus,
    "billing.canceledAt": new Date(),
    "billing.cancelAtPeriodEnd": false,
  });

  return {
    success: true,
    event: "customer.subscription.deleted",
    message: `Tenant "${resolvedTenantId}" subscription canceled`,
  };
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<WebhookResult> {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) {
    return {
      success: true,
      event: "invoice.payment_succeeded",
      message: "Non-subscription invoice — skipped",
    };
  }

  const tenant = await findTenantBySubscription(subscriptionId);
  if (!tenant) {
    return {
      success: false,
      event: "invoice.payment_succeeded",
      message: `No tenant found for subscription "${subscriptionId}"`,
    };
  }

  await updateTenant(tenant._id.toString(), {
    "billing.lastPaymentAt": new Date(),
    "billing.lastPaymentAmount": invoice.amount_paid,
    "billing.lastPaymentStatus": "succeeded",
  });

  return {
    success: true,
    event: "invoice.payment_succeeded",
    message: `Payment succeeded for tenant "${tenant._id}" — amount: ${invoice.amount_paid}`,
  };
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<WebhookResult> {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) {
    return {
      success: true,
      event: "invoice.payment_failed",
      message: "Non-subscription invoice — skipped",
    };
  }

  const tenant = await findTenantBySubscription(subscriptionId);
  if (!tenant) {
    return {
      success: false,
      event: "invoice.payment_failed",
      message: `No tenant found for subscription "${subscriptionId}"`,
    };
  }

  await updateTenant(tenant._id.toString(), {
    "billing.status": "past_due" as SubscriptionStatus,
    "billing.lastPaymentAt": new Date(),
    "billing.lastPaymentAmount": invoice.amount_due,
    "billing.lastPaymentStatus": "failed",
  });

  return {
    success: true,
    event: "invoice.payment_failed",
    message: `Payment failed for tenant "${tenant._id}" — amount due: ${invoice.amount_due}`,
  };
}

// ---------------------------------------------------------------------------
// Database Helpers
// ---------------------------------------------------------------------------

/**
 * Updates a tenant document by ID using a flexible set of dot-notation fields.
 * Uses the raw Mongoose connection to avoid circular dependency on a Tenant model
 * that may or may not exist yet in @illuminate/db.
 */
async function updateTenant(
  tenantId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  await db.collection("tenants").updateOne(
    { _id: new mongoose.Types.ObjectId(tenantId) },
    {
      $set: {
        ...fields,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Finds a tenant by their Stripe subscription ID.
 */
async function findTenantBySubscription(
  stripeSubscriptionId: string
): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  const tenant = await db.collection("tenants").findOne(
    { "billing.stripeSubscriptionId": stripeSubscriptionId },
    { projection: { _id: 1 } }
  );

  return tenant as { _id: mongoose.Types.ObjectId } | null;
}
