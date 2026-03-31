export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import crypto from "crypto";
import {
  connectPlatformDB,
  Tenant,
  connectTenantDB,
  getOrgModels,
} from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";

/**
 * POST /api/public/[slug]/programs/[programSlug]/checkout
 *
 * Creates a Stripe Checkout Session for a program registration.
 * Also creates the ProgramRegistration record with checkInCode.
 *
 * Body: {
 *   playerName: string,
 *   parentEmail: string,
 *   parentPhone?: string,
 *   parentName?: string,
 *   ageGroup?: string,
 *   playerId?: string,
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; programSlug: string } },
): Promise<NextResponse> {
  const { slug, programSlug } = params;

  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug, tenantType: "organization" })
    .select("name settings")
    .lean();
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const conn = await connectTenantDB(slug, "organization");
  const { Program, ProgramRegistration } = getOrgModels(conn);

  const program = await Program.findOne({ slug: programSlug, isActive: true }).lean();
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const p = program as any;
  const body = await req.json();
  const { playerName, parentEmail, parentPhone, parentName, ageGroup, playerId } = body;

  if (!playerName || !parentEmail) {
    return NextResponse.json({ error: "playerName and parentEmail required" }, { status: 400 });
  }

  // Generate unique check-in code
  const checkInCode = `PRG-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  // Create registration
  const registration = await ProgramRegistration.create({
    programId: p._id,
    programSlug: p.slug,
    programName: p.name,
    programType: p.programType,
    playerId: playerId ? new Types.ObjectId(playerId) : undefined,
    playerName,
    ageGroup: ageGroup || undefined,
    parentEmail: parentEmail.toLowerCase(),
    parentPhone: parentPhone || undefined,
    parentName: parentName || undefined,
    fee: p.fee,
    paymentStatus: p.fee > 0 ? "pending" : "waived",
    checkInCode,
    checkedIn: false,
    registeredAt: new Date(),
  });

  // If free program, return immediately with check-in code
  if (p.fee <= 0) {
    await ProgramRegistration.findByIdAndUpdate(registration._id, {
      $set: { paymentStatus: "waived", paidAt: new Date() },
    });

    return NextResponse.json({
      registrationId: registration._id.toString(),
      checkInCode,
      paymentStatus: "waived",
      message: `${playerName} registered for ${p.name}. Show QR code at check-in.`,
    });
  }

  // Create Stripe Checkout Session
  const stripeConfig = getTenantStripeConfig(tenant.settings);
  if (!stripeConfig) {
    return NextResponse.json({
      error: "This organization has not configured payments yet",
      registrationId: registration._id.toString(),
      checkInCode,
      paymentStatus: "pending",
    }, { status: 400 });
  }

  const stripe = getTenantStripe(stripeConfig.secretKey, slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: parentEmail.toLowerCase(),
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: p.name,
          description: `${p.programType} registration for ${playerName}${ageGroup ? ` (${ageGroup})` : ""}`,
        },
        unit_amount: p.fee,
      },
      quantity: 1,
    }],
    metadata: {
      tenantSlug: slug,
      registrationId: registration._id.toString(),
      checkInCode,
      programId: p._id.toString(),
      playerName,
      parentEmail,
      type: "program_registration",
    },
    success_url: `${baseUrl}/${slug}?paid=true&code=${checkInCode}`,
    cancel_url: `${baseUrl}/${slug}?canceled=true`,
  });

  // Save Stripe session ID on registration
  await ProgramRegistration.findByIdAndUpdate(registration._id, {
    $set: { stripeSessionId: session.id },
  });

  return NextResponse.json({
    checkoutUrl: session.url,
    registrationId: registration._id.toString(),
    checkInCode,
  });
}
