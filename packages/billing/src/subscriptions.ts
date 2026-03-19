import type Stripe from "stripe";
import { stripe } from "./stripe";

export async function getSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    {
      expand: ["default_payment_method", "items.data.price.product"],
    }
  );

  return subscription;
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId
  );

  // Find the primary subscription item (first item)
  const primaryItem = subscription.items.data[0];
  if (!primaryItem) {
    throw new Error(
      `No subscription items found for subscription "${stripeSubscriptionId}"`
    );
  }

  const updatedSubscription = await stripe.subscriptions.update(
    stripeSubscriptionId,
    {
      items: [
        {
          id: primaryItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    }
  );

  return updatedSubscription;
}

export async function cancelSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(
    stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  return subscription;
}

export async function addAddon(
  stripeSubscriptionId: string,
  addonPriceId: string,
  quantity: number = 1
): Promise<Stripe.SubscriptionItem> {
  const item = await stripe.subscriptionItems.create({
    subscription: stripeSubscriptionId,
    price: addonPriceId,
    quantity,
    proration_behavior: "create_prorations",
  });

  return item;
}

export async function removeAddon(
  stripeSubscriptionId: string,
  stripeItemId: string
): Promise<Stripe.DeletedSubscriptionItem> {
  const deletedItem = await stripe.subscriptionItems.del(stripeItemId, {
    proration_behavior: "create_prorations",
  });

  return deletedItem;
}
