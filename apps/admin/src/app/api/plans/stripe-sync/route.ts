import { NextResponse } from "next/server";
import { connectPlatformDB, Plan } from "@illuminate/db";
import { stripe } from "@illuminate/billing";

/**
 * POST /api/plans/stripe-sync
 *
 * Provisions Stripe products and prices from the plans in MongoDB,
 * then writes the resulting price IDs back to the DB.
 *
 * Idempotent — uses plan metadata on the Stripe product to find existing
 * products instead of creating duplicates on repeated runs.
 */
export async function POST() {
  await connectPlatformDB();

  const plans = await Plan.find().sort({ sortOrder: 1 }).lean();
  const results: { planId: string; status: string; details: string }[] = [];

  for (const plan of plans) {
    try {
      // --- Find or create the Stripe Product ---
      const existingProducts = await stripe.products.search({
        query: `metadata["illuminate_plan_id"]:"${plan.planId}"`,
      });

      let product = existingProducts.data[0];

      if (!product) {
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: { illuminate_plan_id: plan.planId },
        });
      }

      // --- Find or create Monthly Price ---
      let monthlyPriceId = plan.pricing.stripePriceIdMonthly;
      if (!monthlyPriceId) {
        const existingMonthly = await stripe.prices.search({
          query: `product:"${product.id}" metadata["illuminate_interval"]:"monthly"`,
        });

        if (existingMonthly.data[0]) {
          monthlyPriceId = existingMonthly.data[0].id;
        } else {
          const price = await stripe.prices.create({
            product: product.id,
            currency: "usd",
            unit_amount: plan.pricing.monthly,
            recurring: { interval: "month" },
            nickname: `${plan.name} — Monthly`,
            metadata: {
              illuminate_plan_id: plan.planId,
              illuminate_interval: "monthly",
            },
          });
          monthlyPriceId = price.id;
        }
      }

      // --- Find or create Annual Price ---
      let annualPriceId = plan.pricing.stripePriceIdAnnual;
      if (!annualPriceId) {
        const existingAnnual = await stripe.prices.search({
          query: `product:"${product.id}" metadata["illuminate_interval"]:"annual"`,
        });

        if (existingAnnual.data[0]) {
          annualPriceId = existingAnnual.data[0].id;
        } else {
          const price = await stripe.prices.create({
            product: product.id,
            currency: "usd",
            unit_amount: plan.pricing.annual,
            recurring: { interval: "year" },
            nickname: `${plan.name} — Annual`,
            metadata: {
              illuminate_plan_id: plan.planId,
              illuminate_interval: "annual",
            },
          });
          annualPriceId = price.id;
        }
      }

      // --- Find or create Add-on Prices ---
      const updatedAddOns = await Promise.all(
        plan.addOns.map(async (addon) => {
          let addonPriceId = addon.pricing.stripePriceId;

          if (!addonPriceId) {
            const existingAddon = await stripe.prices.search({
              query: `metadata["illuminate_addon_id"]:"${addon.featureId}" metadata["illuminate_plan_id"]:"${plan.planId}"`,
            });

            if (existingAddon.data[0]) {
              addonPriceId = existingAddon.data[0].id;
            } else {
              // Add-ons use their own Stripe product
              const addonProducts = await stripe.products.search({
                query: `metadata["illuminate_addon_id"]:"${addon.featureId}"`,
              });

              let addonProduct = addonProducts.data[0];
              if (!addonProduct) {
                addonProduct = await stripe.products.create({
                  name: addon.name,
                  description: addon.description,
                  metadata: { illuminate_addon_id: addon.featureId },
                });
              }

              const price = await stripe.prices.create({
                product: addonProduct.id,
                currency: "usd",
                unit_amount: addon.pricing.monthly,
                recurring: { interval: "month" },
                nickname: addon.name,
                metadata: {
                  illuminate_addon_id: addon.featureId,
                  illuminate_plan_id: plan.planId,
                },
              });
              addonPriceId = price.id;
            }
          }

          return {
            ...addon,
            pricing: { ...addon.pricing, stripePriceId: addonPriceId },
          };
        })
      );

      // --- Write price IDs back to MongoDB ---
      await Plan.findOneAndUpdate(
        { planId: plan.planId },
        {
          $set: {
            "pricing.stripePriceIdMonthly": monthlyPriceId,
            "pricing.stripePriceIdAnnual": annualPriceId,
            addOns: updatedAddOns,
          },
        }
      );

      results.push({
        planId: plan.planId,
        status: "ok",
        details: `monthly: ${monthlyPriceId} | annual: ${annualPriceId}`,
      });
    } catch (err: any) {
      results.push({
        planId: plan.planId,
        status: "error",
        details: err?.message ?? "Unknown error",
      });
    }
  }

  const hasErrors = results.some((r) => r.status === "error");
  return NextResponse.json(
    { results },
    { status: hasErrors ? 207 : 200 }
  );
}
