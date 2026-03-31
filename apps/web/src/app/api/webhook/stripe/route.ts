export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  connectPlatformDB,
  Tenant,
  connectTenantDB,
  getOrgModels,
} from "@goparticipate/db";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";
import { sendEmail, sendSMS } from "@goparticipate/email";

/**
 * POST /api/webhook/stripe — handle Stripe events for program registrations
 *
 * Handles checkout.session.completed for type=program_registration:
 * 1. Marks ProgramRegistration as paid
 * 2. Sends confirmation email + SMS with check-in code
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  // Parse the event to get metadata (tenantSlug)
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const metadata = event?.data?.object?.metadata;
  if (!metadata?.tenantSlug || metadata?.type !== "program_registration") {
    // Not a program registration event — ignore
    return NextResponse.json({ received: true });
  }

  const { tenantSlug, registrationId, checkInCode, playerName, parentEmail } = metadata;

  // Verify signature if webhook secret is configured
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name settings").lean();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stripeConfig = getTenantStripeConfig(tenant.settings);
  if (stripeConfig?.webhookSecret) {
    const stripe = getTenantStripe(stripeConfig.secretKey, tenantSlug);
    const sig = req.headers.get("stripe-signature");
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig!, stripeConfig.webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (registrationId) {
      const conn = await connectTenantDB(tenantSlug, "organization");
      const { ProgramRegistration } = getOrgModels(conn);

      const registration = await ProgramRegistration.findByIdAndUpdate(
        registrationId,
        {
          $set: {
            paymentStatus: "paid",
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent,
          },
        },
        { new: true },
      ).lean();

      if (registration) {
        const reg = registration as any;
        const orgName = tenant.name;

        // Send confirmation email with check-in code
        if (reg.parentEmail) {
          sendEmail({
            to: reg.parentEmail,
            subject: `Registration Confirmed — ${reg.programName}`,
            react: null as any, // TODO: use ProgramConfirmationEmail template
            html: `
              <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 24px;">
                <h2 style="margin: 0 0 8px;">${orgName}</h2>
                <p style="color: #6b7280; margin: 0 0 16px;">Registration Confirmed</p>
                <hr style="border-color: #e5e7eb; margin: 16px 0;" />
                <p>Hi ${reg.parentName || "there"},</p>
                <p><strong>${reg.playerName}</strong> is registered for <strong>${reg.programName}</strong>!</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                  <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px;">Your Check-In Code</p>
                  <p style="font-size: 28px; font-weight: 700; font-family: monospace; letter-spacing: 2px; margin: 0;">${reg.checkInCode}</p>
                  <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0;">Show this code or the QR at the event entrance</p>
                </div>
                ${reg.ageGroup ? `<p><strong>Age Group:</strong> ${reg.ageGroup}</p>` : ""}
                <p><strong>Amount Paid:</strong> $${(reg.fee / 100).toFixed(2)}</p>
                <hr style="border-color: #e5e7eb; margin: 16px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">Powered by Go Participate</p>
              </div>
            `,
          }).catch((err) => console.error("[webhook] Email failed:", err));
        }

        // Send SMS with check-in code
        if (reg.parentPhone) {
          sendSMS({
            to: reg.parentPhone,
            body: `${reg.playerName} is registered for ${reg.programName}! Check-in code: ${reg.checkInCode}. Show this at the event. - ${orgName}`,
          }).catch((err) => console.error("[webhook] SMS failed:", err));
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
