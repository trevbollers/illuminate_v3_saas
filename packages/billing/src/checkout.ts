import type Stripe from "stripe";
import { stripe } from "./stripe";
import { getPriceId, type BillingInterval } from "./plans";

export interface CreateCheckoutSessionParams {
  planId: string;
  billingInterval: BillingInterval;
  tenantId: string;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const {
    planId,
    billingInterval,
    tenantId,
    userId,
    email,
    successUrl,
    cancelUrl,
  } = params;

  const priceId = await getPriceId(planId, billingInterval);
  if (!priceId) {
    throw new Error(
      `Invalid plan "${planId}" or interval "${billingInterval}"`
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        tenantId,
        userId,
        planId,
      },
    },
    metadata: {
      tenantId,
      userId,
      planId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return session;
}

export interface CreateBillingPortalSessionParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export async function createBillingPortalSession(
  params: CreateBillingPortalSessionParams
): Promise<Stripe.BillingPortal.Session> {
  const { stripeCustomerId, returnUrl } = params;

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}
