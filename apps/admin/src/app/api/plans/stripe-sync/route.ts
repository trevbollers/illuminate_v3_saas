import { NextResponse } from "next/server";
import { connectPlatformDB, Plan } from "@illuminate/db";
import { stripe } from "@illuminate/billing";

/**
 * POST /api/plans/stripe-sync
 *
 * Imports all active Stripe products into MongoDB as plans.
 * Stripe is the source of truth for: name, description, pricing, price IDs.
 * MongoDB (admin UI) is the source of truth for: features, limits.
 *
 * - Skips add-on products (those with illuminate_addon_id metadata)
 * - Handles free plans (no recurring prices → monthly/annual = 0)
 * - Preserves existing features & limits if the plan already exists in DB
 * - Sets illuminate_plan_id metadata on Stripe products that don't have it
 * - Idempotent — safe to run multiple times
 */

function toPlanId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const DEFAULT_LIMITS: Record<string, object> = {
  beginner:     { users: 1,   locations: 1, products: 25,   ordersPerMonth: 50,    storageGb: 1   },
  starter:      { users: 5,   locations: 1, products: 50,   ordersPerMonth: 100,   storageGb: 5   },
  professional: { users: 25,  locations: 5, products: 500,  ordersPerMonth: 1000,  storageGb: 25  },
  enterprise:   { users: 999, locations: 999, products: 9999, ordersPerMonth: 99999, storageGb: 100 },
};

export async function POST() {
  await connectPlatformDB();

  const stripeProducts = await stripe.products.list({ active: true, limit: 100 });

  // Skip add-on products — they have their own metadata key
  const planProducts = stripeProducts.data.filter(
    (p) => !p.metadata.illuminate_addon_id
  );

  const results: { planId: string; name: string; status: string; details: string }[] = [];

  for (const product of planProducts) {
    try {
      // Derive planId from metadata or slugify the product name
      let planId = product.metadata.illuminate_plan_id || toPlanId(product.name);

      // Fetch all active prices for this product
      const priceList = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 10,
      });

      const monthlyPrice = priceList.data.find((p) => p.recurring?.interval === "month");
      const annualPrice  = priceList.data.find((p) => p.recurring?.interval === "year");

      const monthlyAmount = monthlyPrice?.unit_amount ?? 0;
      const annualAmount  = annualPrice?.unit_amount ?? 0;

      // Find existing DB plan to preserve features, limits, and any already-set price IDs
      const existing = await Plan.findOne({ planId }).lean();

      // Only overwrite price IDs if Stripe has them; otherwise keep existing DB values
      const monthlyPriceId =
        monthlyPrice?.id ?? (existing as any)?.pricing?.stripePriceIdMonthly ?? "";
      const annualPriceId =
        annualPrice?.id ?? (existing as any)?.pricing?.stripePriceIdAnnual ?? "";

      const description = product.description ?? (existing as any)?.description ?? "";

      // Sort order: free = 0, otherwise use monthly price amount as a natural sort key
      const sortOrder = monthlyAmount === 0 ? 0 : monthlyAmount;

      await Plan.findOneAndUpdate(
        { planId },
        {
          $set: {
            name: product.name,
            description,
            "pricing.monthly": monthlyAmount,
            "pricing.annual": annualAmount,
            "pricing.stripePriceIdMonthly": monthlyPriceId,
            "pricing.stripePriceIdAnnual": annualPriceId,
            isActive: true,
            sortOrder,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            planId,
            features: [],
            limits: DEFAULT_LIMITS[planId] ?? DEFAULT_LIMITS.starter,
            addOns: [],
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Tag the Stripe product with our planId so future syncs are deterministic
      if (!product.metadata.illuminate_plan_id) {
        await stripe.products.update(product.id, {
          metadata: { ...product.metadata, illuminate_plan_id: planId },
        });
      }

      results.push({
        planId,
        name: product.name,
        status: "ok",
        details:
          monthlyAmount === 0
            ? "free plan"
            : `monthly: $${(monthlyAmount / 100).toFixed(2)} | annual: $${(annualAmount / 100).toFixed(2)}`,
      });
    } catch (err: any) {
      results.push({
        planId: product.metadata.illuminate_plan_id || toPlanId(product.name),
        name: product.name,
        status: "error",
        details: err?.message ?? "Unknown error",
      });
    }
  }

  const hasErrors = results.some((r) => r.status === "error");
  return NextResponse.json({ results }, { status: hasErrors ? 207 : 200 });
}
