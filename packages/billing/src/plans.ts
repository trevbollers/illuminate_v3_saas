import { Plan, type IPlan } from "@illuminate/db";

export type BillingInterval = "monthly" | "yearly";

/**
 * Look up a plan by its planId (e.g. "starter", "professional").
 * Returns null if not found or inactive.
 */
export async function getPlan(planId: string): Promise<IPlan | null> {
  return Plan.findOne({ planId, isActive: true });
}

/**
 * Get all active plans, ordered by sortOrder.
 */
export async function getPlans(): Promise<IPlan[]> {
  return Plan.find({ isActive: true }).sort({ sortOrder: 1 });
}

/**
 * Given a Stripe priceId, find the matching plan.
 * Checks both monthly and annual price IDs.
 */
export async function getPlanByPriceId(
  priceId: string
): Promise<IPlan | null> {
  return Plan.findOne({
    isActive: true,
    $or: [
      { "pricing.stripePriceIdMonthly": priceId },
      { "pricing.stripePriceIdAnnual": priceId },
    ],
  });
}

/**
 * Given a Stripe priceId, find the matching add-on and its parent plan.
 */
export async function getAddonByPriceId(
  priceId: string
): Promise<{ plan: IPlan; addon: IPlan["addOns"][number] } | null> {
  const plan = await Plan.findOne({
    isActive: true,
    "addOns.pricing.stripePriceId": priceId,
  });

  if (!plan) return null;

  const addon = plan.addOns.find((a) => a.pricing.stripePriceId === priceId);
  if (!addon) return null;

  return { plan, addon };
}

/**
 * Get the Stripe priceId for a given plan + interval.
 */
export async function getPriceId(
  planId: string,
  interval: BillingInterval
): Promise<string | null> {
  const plan = await getPlan(planId);
  if (!plan) return null;

  const priceId =
    interval === "monthly"
      ? plan.pricing.stripePriceIdMonthly
      : plan.pricing.stripePriceIdAnnual;

  return priceId || null;
}
