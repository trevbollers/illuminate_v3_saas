export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant, connectTenantDB, registerLeagueModels, getLeagueModels } from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";

// POST /api/events/league/register — register a team for a league event and create checkout
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const tenantId = h.get("x-tenant-id");
  if (!tenantSlug || !userId || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { leagueSlug, eventId, divisionId, teamId, teamName } = body;

  if (!leagueSlug || !eventId || !divisionId || !teamId || !teamName) {
    return NextResponse.json(
      { error: "Missing required fields: leagueSlug, eventId, divisionId, teamId, teamName" },
      { status: 400 },
    );
  }

  // Connect to the league's DB
  const conn = await connectTenantDB(leagueSlug, "league");
  registerLeagueModels(conn);
  const models = getLeagueModels(conn);

  // Verify event exists and registration is open
  const event = await models.Event.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if ((event as any).status !== "registration_open") {
    return NextResponse.json({ error: "Registration is not open for this event" }, { status: 400 });
  }

  // Verify division
  const division = await models.Division.findOne({
    _id: new Types.ObjectId(divisionId),
    eventId: new Types.ObjectId(eventId),
  }).lean();
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Check capacity
  if ((division as any).maxTeams) {
    const currentCount = await models.Registration.countDocuments({
      eventId: new Types.ObjectId(eventId),
      divisionId: new Types.ObjectId(divisionId),
      status: { $nin: ["rejected", "withdrawn"] },
    });
    if (currentCount >= (division as any).maxTeams) {
      return NextResponse.json({ error: "Division is full" }, { status: 400 });
    }
  }

  // Check duplicate
  const existing = await models.Registration.findOne({
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(divisionId),
    teamId: new Types.ObjectId(teamId),
    status: { $nin: ["rejected", "withdrawn"] },
  }).lean();
  if (existing) {
    return NextResponse.json({ error: "This team is already registered" }, { status: 409 });
  }

  // Create registration
  const registration = await models.Registration.create({
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(divisionId),
    orgTenantId: new Types.ObjectId(tenantId),
    teamId: new Types.ObjectId(teamId),
    teamName,
    roster: [],
    status: "pending",
    paymentStatus: "unpaid",
    amountPaid: 0,
    registeredBy: new Types.ObjectId(userId),
  });

  // Calculate price
  const pricing = (event as any).pricing;
  let amountCents = pricing?.amount || 0;

  if (pricing?.earlyBirdAmount && pricing?.earlyBirdDeadline) {
    if (new Date() < new Date(pricing.earlyBirdDeadline)) {
      amountCents = pricing.earlyBirdAmount;
    }
  }
  if (pricing?.lateFeeAmount && pricing?.lateFeeStartDate) {
    if (new Date() >= new Date(pricing.lateFeeStartDate)) {
      amountCents += pricing.lateFeeAmount;
    }
  }

  // Multi-team discount
  if (pricing?.multiTeamDiscounts?.length > 0) {
    const orgRegCount = await models.Registration.countDocuments({
      eventId: new Types.ObjectId(eventId),
      orgTenantId: new Types.ObjectId(tenantId),
      status: { $nin: ["rejected", "withdrawn"] },
    });
    const sorted = [...pricing.multiTeamDiscounts].sort(
      (a: any, b: any) => b.minTeams - a.minTeams,
    );
    for (const d of sorted) {
      if (orgRegCount >= d.minTeams) {
        if (d.discountAmountPerTeam) {
          amountCents -= d.discountAmountPerTeam;
        } else if (d.discountPercent) {
          amountCents = Math.round(amountCents * (1 - d.discountPercent / 100));
        }
        break;
      }
    }
  }

  amountCents = Math.max(amountCents, 0);

  // If free, mark paid immediately
  if (amountCents === 0) {
    await models.Registration.findByIdAndUpdate(registration._id, {
      $set: { paymentStatus: "paid", amountPaid: 0, status: "approved" },
    });
    return NextResponse.json({
      registrationId: registration._id,
      free: true,
      message: "Registration confirmed — no payment required.",
    });
  }

  // Get the LEAGUE's Stripe config — this is the league's account, not the org's.
  // The org is paying the league for event registration.
  await connectPlatformDB();
  const leagueTenant = await Tenant.findOne({ slug: leagueSlug }).lean();
  const stripeConfig = getTenantStripeConfig((leagueTenant as any)?.settings);

  if (!stripeConfig) {
    // No Stripe configured — registration created but payment must be handled manually
    const payments = (leagueTenant as any)?.settings?.payments;
    return NextResponse.json({
      registrationId: registration._id,
      amount: amountCents,
      paymentMethods: getAvailablePaymentMethods(payments),
      message: "Registration submitted. Payment required — see available payment methods.",
    });
  }

  // Create Stripe Checkout session using the LEAGUE's own keys (not the org's, not the platform's)
  const stripe = getTenantStripe(stripeConfig.secretKey, leagueSlug);

  const baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `${(event as any).name} — ${teamName}`,
            description: `Registration: ${(division as any).label}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      eventId,
      registrationId: registration._id.toString(),
      teamName,
      divisionId,
      tenantSlug: leagueSlug,
      orgTenantSlug: tenantSlug,
    },
    success_url: `${baseUrl}/events?registration=success&event=${eventId}`,
    cancel_url: `${baseUrl}/events?registration=canceled&event=${eventId}`,
  });

  // Store checkout session ID
  await models.Registration.findByIdAndUpdate(registration._id, {
    $set: { stripePaymentIntentId: checkoutSession.id },
  });

  return NextResponse.json({
    registrationId: registration._id,
    checkoutUrl: checkoutSession.url,
    amount: amountCents,
  });
}

function getAvailablePaymentMethods(payments: any): string[] {
  if (!payments?.providers) return ["cash_check"];
  return payments.providers
    .filter((p: any) => p.enabled)
    .map((p: any) => p.provider);
}
