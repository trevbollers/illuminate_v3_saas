export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import {
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
  registerLeagueModels,
  getLeagueModels,
  connectPlatformDB,
  Tenant,
} from "@goparticipate/db";

// POST /api/registration-cart/items — add an item to the cart
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const tenantId = h.get("x-tenant-id");
  if (!tenantSlug || !userId || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { leagueSlug, eventId, divisionId, teamId } = body;

  if (!leagueSlug || !eventId || !divisionId || !teamId) {
    return NextResponse.json(
      { error: "Missing required fields: leagueSlug, eventId, divisionId, teamId" },
      { status: 400 },
    );
  }

  // Connect to league DB to validate event/division
  const leagueConn = await connectTenantDB(leagueSlug, "league");
  registerLeagueModels(leagueConn);
  const leagueModels = getLeagueModels(leagueConn);

  // Verify event exists and registration is open
  const event = await leagueModels.Event.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if ((event as any).status !== "registration_open") {
    return NextResponse.json({ error: "Registration is not open for this event" }, { status: 400 });
  }

  // Verify division
  const division = await leagueModels.Division.findOne({
    _id: new Types.ObjectId(divisionId),
    eventId: new Types.ObjectId(eventId),
  }).lean();
  if (!division) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Check capacity (soft check — hard check at checkout)
  if ((division as any).maxTeams) {
    const currentCount = await leagueModels.Registration.countDocuments({
      eventId: new Types.ObjectId(eventId),
      divisionId: new Types.ObjectId(divisionId),
      status: { $nin: ["rejected", "withdrawn"] },
    });
    if (currentCount >= (division as any).maxTeams) {
      return NextResponse.json({ error: "Division is full" }, { status: 400 });
    }
  }

  // Check duplicate in league DB
  const existingReg = await leagueModels.Registration.findOne({
    eventId: new Types.ObjectId(eventId),
    divisionId: new Types.ObjectId(divisionId),
    teamId: new Types.ObjectId(teamId),
    status: { $nin: ["rejected", "withdrawn"] },
  }).lean();
  if (existingReg) {
    return NextResponse.json({ error: "This team is already registered for this division" }, { status: 409 });
  }

  // Get team name from org DB
  const orgConn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(orgConn);
  const orgModels = getOrgModels(orgConn);

  const team = await orgModels.Team.findById(teamId).lean();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Get league name from platform DB
  await connectPlatformDB();
  const leagueTenant = await Tenant.findOne({ slug: leagueSlug }).lean();
  const leagueName = (leagueTenant as any)?.name || leagueSlug;

  // Calculate base price
  const pricing = (event as any).pricing;
  let unitPriceCents = pricing?.amount || 0;
  if (pricing?.earlyBirdAmount && pricing?.earlyBirdDeadline) {
    if (new Date() < new Date(pricing.earlyBirdDeadline)) {
      unitPriceCents = pricing.earlyBirdAmount;
    }
  }
  if (pricing?.lateFeeAmount && pricing?.lateFeeStartDate) {
    if (new Date() >= new Date(pricing.lateFeeStartDate)) {
      unitPriceCents += pricing.lateFeeAmount;
    }
  }

  const cartItem = {
    leagueSlug,
    leagueName,
    eventId,
    eventName: (event as any).name,
    divisionId,
    divisionLabel: (division as any).label,
    teamId: new Types.ObjectId(teamId),
    teamName: (team as any).name,
    sport: (event as any).sport || (team as any).sport,
    unitPriceCents,
    addedAt: new Date(),
    addedBy: new Types.ObjectId(userId),
  };

  // Get or create the active cart
  let cart = await orgModels.RegistrationCart.findOne({
    orgTenantId: new Types.ObjectId(tenantId),
    status: "active",
  });

  if (!cart) {
    cart = await orgModels.RegistrationCart.create({
      orgTenantId: new Types.ObjectId(tenantId),
      status: "active",
      items: [cartItem],
      checkouts: [],
      createdBy: new Types.ObjectId(userId),
    });
  } else {
    // Check duplicate in cart
    const duplicate = (cart as any).items.find(
      (i: any) =>
        i.eventId === eventId &&
        i.divisionId === divisionId &&
        i.teamId.toString() === teamId,
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "This team is already in your cart for this division" },
        { status: 409 },
      );
    }

    cart.items.push(cartItem as any);
    await cart.save();
  }

  return NextResponse.json({
    message: `${(team as any).name} added to cart for ${(event as any).name} — ${(division as any).label}`,
    itemCount: cart.items.length,
    cartId: cart._id,
  });
}
