export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { getLeagueTenant } from "@/lib/tenant-db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";

// POST /api/events/[id]/registrations/checkout — create a Stripe Checkout session for event registration
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const event = await tenant.models.Event.findById(params.id).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const { registrationId, successUrl, cancelUrl } = body;

  if (!registrationId || !successUrl || !cancelUrl) {
    return NextResponse.json(
      { error: "Missing required fields: registrationId, successUrl, cancelUrl" },
      { status: 400 },
    );
  }

  // Fetch the registration
  const registration = await tenant.models.Registration.findById(registrationId).lean();
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if ((registration as any).paymentStatus === "paid") {
    return NextResponse.json({ error: "Registration is already paid" }, { status: 400 });
  }

  // Get the league tenant's Stripe config from platform DB
  await connectPlatformDB();
  const tenantDoc = await Tenant.findOne({ slug: tenant.tenantSlug }).lean();
  if (!tenantDoc) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stripeConfig = getTenantStripeConfig((tenantDoc as any).settings);

  if (!stripeConfig) {
    return NextResponse.json(
      { error: "Stripe is not configured for this league. Contact the league administrator." },
      { status: 400 },
    );
  }

  // Calculate amount
  const pricing = event.pricing;
  let amountCents = pricing.amount || 0;

  // Check early bird pricing
  if (pricing.earlyBirdAmount && pricing.earlyBirdDeadline) {
    const now = new Date();
    if (now < new Date(pricing.earlyBirdDeadline)) {
      amountCents = pricing.earlyBirdAmount;
    }
  }

  // Check late fee
  if (pricing.lateFeeAmount && pricing.lateFeeStartDate) {
    const now = new Date();
    if (now >= new Date(pricing.lateFeeStartDate)) {
      amountCents += pricing.lateFeeAmount;
    }
  }

  // Check multi-team discount
  if (pricing.multiTeamDiscounts && pricing.multiTeamDiscounts.length > 0) {
    const orgRegCount = await tenant.models.Registration.countDocuments({
      eventId: new Types.ObjectId(params.id),
      orgTenantId: (registration as any).orgTenantId,
      status: { $nin: ["rejected", "withdrawn"] },
    });

    // Find the best applicable discount
    const sortedDiscounts = [...pricing.multiTeamDiscounts].sort(
      (a: any, b: any) => b.minTeams - a.minTeams,
    );
    for (const discount of sortedDiscounts) {
      if (orgRegCount >= discount.minTeams) {
        if (discount.discountAmountPerTeam) {
          amountCents -= discount.discountAmountPerTeam;
        } else if (discount.discountPercent) {
          amountCents = Math.round(amountCents * (1 - discount.discountPercent / 100));
        }
        break;
      }
    }
  }

  // Ensure positive amount
  amountCents = Math.max(amountCents, 0);

  if (amountCents === 0) {
    // Free event — just mark as paid
    await tenant.models.Registration.findByIdAndUpdate(registrationId, {
      $set: { paymentStatus: "paid", amountPaid: 0 },
    });
    return NextResponse.json({ free: true, message: "No payment required — registration confirmed." });
  }

  // Create Stripe Checkout session with the LEAGUE'S own keys (not platform keys)
  const stripe = getTenantStripe(stripeConfig.secretKey, tenant.tenantSlug);

  // Find the division for the line item description
  const division = await tenant.models.Division.findById(
    (registration as any).divisionId,
  ).lean();
  const divisionLabel = (division as any)?.label || "Division";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `${event.name} — ${(registration as any).teamName}`,
            description: `Event registration: ${divisionLabel}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      eventId: params.id,
      registrationId: registrationId,
      teamName: (registration as any).teamName,
      divisionId: (registration as any).divisionId.toString(),
      tenantSlug: tenant.tenantSlug,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  // Store the checkout session ID on the registration
  await tenant.models.Registration.findByIdAndUpdate(registrationId, {
    $set: { stripePaymentIntentId: session.id },
  });

  return NextResponse.json({
    checkoutUrl: session.url,
    sessionId: session.id,
    amount: amountCents,
  });
}
