export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels, getLeagueModels } from "@goparticipate/db";

// GET /api/registration-cart — get the org's active cart with recalculated prices
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug || !session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const cart = await models.RegistrationCart.findOne({
    orgTenantId: new Types.ObjectId(session.user.tenantId),
    status: "active",
  }).lean();

  if (!cart) {
    return NextResponse.json({ cart: null, itemCount: 0 });
  }

  // Recalculate prices for each item by fetching current event pricing
  const enrichedItems = [];
  const leagueConnections = new Map<string, ReturnType<typeof getLeagueModels>>();

  for (const item of (cart as any).items) {
    let finalPriceCents = item.unitPriceCents;
    let discountLabel: string | undefined;
    let isStale = false;
    let capacityWarning = false;

    try {
      // Get or reuse league connection
      if (!leagueConnections.has(item.leagueSlug)) {
        const leagueConn = await connectTenantDB(item.leagueSlug, "league");
        leagueConnections.set(item.leagueSlug, getLeagueModels(leagueConn));
      }
      const leagueModels = leagueConnections.get(item.leagueSlug)!;

      const event = await leagueModels.Event.findById(item.eventId).lean();
      if (!event || (event as any).status !== "registration_open") {
        isStale = true;
      } else {
        // Recalculate price from current event pricing
        const pricing = (event as any).pricing;
        let amount = pricing?.amount || 0;

        if (pricing?.earlyBirdAmount && pricing?.earlyBirdDeadline) {
          if (new Date() < new Date(pricing.earlyBirdDeadline)) {
            amount = pricing.earlyBirdAmount;
          }
        }
        if (pricing?.lateFeeAmount && pricing?.lateFeeStartDate) {
          if (new Date() >= new Date(pricing.lateFeeStartDate)) {
            amount += pricing.lateFeeAmount;
          }
        }

        // Multi-team discount: count existing registrations + cart items for this event
        if (pricing?.multiTeamDiscounts?.length > 0) {
          const existingRegCount = await leagueModels.Registration.countDocuments({
            eventId: new Types.ObjectId(item.eventId),
            orgTenantId: new Types.ObjectId(session.user.tenantId),
            status: { $nin: ["rejected", "withdrawn"] },
          });
          const cartItemsForEvent = (cart as any).items.filter(
            (i: any) => i.eventId === item.eventId,
          ).length;
          const totalTeams = existingRegCount + cartItemsForEvent;

          const sorted = [...pricing.multiTeamDiscounts].sort(
            (a: any, b: any) => b.minTeams - a.minTeams,
          );
          for (const d of sorted) {
            if (totalTeams >= d.minTeams) {
              if (d.discountAmountPerTeam) {
                amount -= d.discountAmountPerTeam;
                discountLabel = `$${(d.discountAmountPerTeam / 100).toFixed(2)} multi-team discount`;
              } else if (d.discountPercent) {
                amount = Math.round(amount * (1 - d.discountPercent / 100));
                discountLabel = `${d.discountPercent}% multi-team discount`;
              }
              break;
            }
          }
        }

        finalPriceCents = Math.max(amount, 0);

        // Check capacity
        const division = await leagueModels.Division.findById(item.divisionId).lean();
        if (division && (division as any).maxTeams) {
          const regCount = await leagueModels.Registration.countDocuments({
            eventId: new Types.ObjectId(item.eventId),
            divisionId: new Types.ObjectId(item.divisionId),
            status: { $nin: ["rejected", "withdrawn"] },
          });
          if (regCount >= (division as any).maxTeams) {
            capacityWarning = true;
          }
        }
      }

      // Stale if added more than 48 hours ago
      const hoursSinceAdded = (Date.now() - new Date(item.addedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceAdded > 48) {
        isStale = true;
      }
    } catch {
      isStale = true;
    }

    enrichedItems.push({
      ...item,
      finalPriceCents,
      discountLabel,
      isStale,
      capacityWarning,
    });
  }

  // Group subtotals by league
  const subtotalByLeague: Record<string, { leagueName: string; amount: number }> = {};
  for (const item of enrichedItems) {
    if (!subtotalByLeague[item.leagueSlug]) {
      subtotalByLeague[item.leagueSlug] = { leagueName: item.leagueName, amount: 0 };
    }
    subtotalByLeague[item.leagueSlug].amount += item.finalPriceCents;
  }

  const totalCents = enrichedItems.reduce((sum, i) => sum + i.finalPriceCents, 0);

  return NextResponse.json({
    cart: {
      _id: (cart as any)._id,
      status: (cart as any).status,
      items: enrichedItems,
      checkouts: (cart as any).checkouts,
      createdAt: (cart as any).createdAt,
    },
    subtotalByLeague,
    totalCents,
    itemCount: enrichedItems.length,
  });
}
