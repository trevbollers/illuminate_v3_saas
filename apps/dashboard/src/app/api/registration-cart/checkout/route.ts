export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectTenantDB,
  getOrgModels,
  getLeagueModels,
  connectPlatformDB,
  Tenant,
} from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";

// POST /api/registration-cart/checkout — create registrations + Stripe sessions
export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug || !session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgConn = await connectTenantDB(session.user.tenantSlug, "organization");
  const orgModels = getOrgModels(orgConn);

  const cart = await orgModels.RegistrationCart.findOne({
    orgTenantId: new Types.ObjectId(session.user.tenantId),
    status: "active",
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Group items by league
  const byLeague = new Map<string, any[]>();
  for (const item of cart.items) {
    const slug = (item as any).leagueSlug;
    if (!byLeague.has(slug)) byLeague.set(slug, []);
    byLeague.get(slug)!.push(item);
  }

  await connectPlatformDB();

  const checkouts: Array<{
    leagueSlug: string;
    leagueName: string;
    checkoutUrl: string | null;
    amountCents: number;
    registrationIds: string[];
    free: boolean;
    manual: boolean;
  }> = [];
  const errors: string[] = [];

  for (const [leagueSlug, items] of byLeague) {
    const leagueConn = await connectTenantDB(leagueSlug, "league");
    const leagueModels = getLeagueModels(leagueConn);

    const registrationIds: string[] = [];
    const lineItems: Array<{
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; description: string };
      };
      quantity: number;
    }> = [];
    let totalAmountCents = 0;

    for (const item of items) {
      // Re-validate event
      const event = await leagueModels.Event.findById(item.eventId).lean();
      if (!event || (event as any).status !== "registration_open") {
        errors.push(`${item.eventName} is no longer open for registration`);
        continue;
      }

      // Re-validate division capacity
      const division = await leagueModels.Division.findById(item.divisionId).lean();
      if ((division as any)?.maxTeams) {
        const currentCount = await leagueModels.Registration.countDocuments({
          eventId: new Types.ObjectId(item.eventId),
          divisionId: new Types.ObjectId(item.divisionId),
          status: { $nin: ["rejected", "withdrawn"] },
        });
        if (currentCount >= (division as any).maxTeams) {
          errors.push(`${item.eventName} — ${item.divisionLabel} is full`);
          continue;
        }
      }

      // Check duplicate
      const existing = await leagueModels.Registration.findOne({
        eventId: new Types.ObjectId(item.eventId),
        divisionId: new Types.ObjectId(item.divisionId),
        teamId: new Types.ObjectId(item.teamId),
        status: { $nin: ["rejected", "withdrawn"] },
      }).lean();
      if (existing) {
        errors.push(`${item.teamName} is already registered for ${item.divisionLabel}`);
        continue;
      }

      // Calculate price with multi-team discount
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

      // Multi-team discount: count existing regs + all cart items for this event
      if (pricing?.multiTeamDiscounts?.length > 0) {
        const existingRegCount = await leagueModels.Registration.countDocuments({
          eventId: new Types.ObjectId(item.eventId),
          orgTenantId: new Types.ObjectId(session.user.tenantId),
          status: { $nin: ["rejected", "withdrawn"] },
        });
        const cartItemsForEvent = items.filter(
          (i: any) => i.eventId === item.eventId,
        ).length;
        const totalTeams = existingRegCount + cartItemsForEvent;

        const sorted = [...pricing.multiTeamDiscounts].sort(
          (a: any, b: any) => b.minTeams - a.minTeams,
        );
        for (const d of sorted) {
          if (totalTeams >= d.minTeams) {
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

      // Create registration in league DB
      const registration = await leagueModels.Registration.create({
        eventId: new Types.ObjectId(item.eventId),
        divisionId: new Types.ObjectId(item.divisionId),
        orgTenantId: new Types.ObjectId(session.user.tenantId),
        teamId: new Types.ObjectId(item.teamId),
        teamName: item.teamName,
        roster: [],
        status: "pending",
        paymentStatus: "unpaid",
        amountPaid: 0,
        registeredBy: new Types.ObjectId(session.user.id),
      });

      registrationIds.push(registration._id.toString());
      totalAmountCents += amountCents;

      if (amountCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${(event as any).name} — ${item.teamName}`,
              description: `Registration: ${(division as any)?.label || item.divisionLabel}`,
            },
          },
          quantity: 1,
        });
      }
    }

    if (registrationIds.length === 0) continue;

    // If all free, mark paid immediately
    if (totalAmountCents === 0) {
      for (const regId of registrationIds) {
        await leagueModels.Registration.findByIdAndUpdate(regId, {
          $set: { paymentStatus: "paid", amountPaid: 0, status: "approved" },
        });
      }
      cart.checkouts.push({
        leagueSlug,
        status: "paid",
        amountCents: 0,
        paidAt: new Date(),
        registrationIds,
      } as any);
      checkouts.push({
        leagueSlug,
        leagueName: items[0].leagueName,
        checkoutUrl: null,
        amountCents: 0,
        registrationIds,
        free: true,
        manual: false,
      });
      continue;
    }

    // Get league's Stripe config
    const leagueTenant = await Tenant.findOne({ slug: leagueSlug }).lean();
    const stripeConfig = getTenantStripeConfig((leagueTenant as any)?.settings);

    if (!stripeConfig) {
      // Manual payment — registrations created but unpaid
      cart.checkouts.push({
        leagueSlug,
        status: "pending",
        amountCents: totalAmountCents,
        registrationIds,
      } as any);
      checkouts.push({
        leagueSlug,
        leagueName: items[0].leagueName,
        checkoutUrl: null,
        amountCents: totalAmountCents,
        registrationIds,
        free: false,
        manual: true,
      });
      continue;
    }

    // Create Stripe Checkout session with multiple line items
    const stripe = getTenantStripe(stripeConfig.secretKey, leagueSlug);
    const baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        cartId: cart._id.toString(),
        registrationIds: registrationIds.join(","),
        orgTenantSlug: session.user.tenantSlug,
        tenantSlug: leagueSlug,
      },
      success_url: `${baseUrl}/registration-cart?checkout=success&league=${leagueSlug}`,
      cancel_url: `${baseUrl}/registration-cart?checkout=canceled&league=${leagueSlug}`,
    });

    // Store session ID on registrations
    for (const regId of registrationIds) {
      await leagueModels.Registration.findByIdAndUpdate(regId, {
        $set: { stripePaymentIntentId: checkoutSession.id },
      });
    }

    cart.checkouts.push({
      leagueSlug,
      stripeSessionId: checkoutSession.id,
      status: "pending",
      amountCents: totalAmountCents,
      registrationIds,
    } as any);

    checkouts.push({
      leagueSlug,
      leagueName: items[0].leagueName,
      checkoutUrl: checkoutSession.url,
      amountCents: totalAmountCents,
      registrationIds,
      free: false,
      manual: false,
    });
  }

  // Update cart status
  cart.status = "checking_out";
  await cart.save();

  // If all checkouts are free/paid, mark cart completed
  const allPaid = cart.checkouts.every((c: any) => c.status === "paid");
  if (allPaid && cart.checkouts.length > 0) {
    cart.status = "completed";
    await cart.save();
  }

  return NextResponse.json({
    checkouts,
    errors,
    cartStatus: cart.status,
  });
}
