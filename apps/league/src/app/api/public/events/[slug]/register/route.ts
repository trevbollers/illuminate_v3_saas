export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";
import {
  connectPlatformDB,
  connectTenantDB,
  Tenant,
  User,
  registerOrgModels,
  getOrgModels,
} from "@goparticipate/db";
import { sendEmail } from "@goparticipate/email";
import { getTenantStripe, getTenantStripeConfig } from "@goparticipate/billing";
import { Types } from "mongoose";

// ============================================================
// GET — event info for registration page
// ============================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const ctx = await getPublicLeagueTenant();
  if (!ctx) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const { models } = ctx;
  const event = await models.Event.findOne({
    slug,
    status: "registration_open",
  })
    .select(
      "name slug type sport startDate endDate locations status pricing settings divisionIds",
    )
    .lean();

  if (!event) {
    return NextResponse.json(
      { error: "Event not found or registration is closed" },
      { status: 404 },
    );
  }

  const divisionIds = (event as any).divisionIds || [];
  const divisions = await models.Division.find({ _id: { $in: divisionIds } })
    .select("key label minAge maxAge skillLevel maxTeams")
    .lean();

  const regCounts = await models.Registration.aggregate([
    {
      $match: {
        eventId: (event as any)._id,
        status: { $in: ["pending", "approved"] },
      },
    },
    { $group: { _id: "$divisionId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(
    regCounts.map((r: any) => [r._id?.toString(), r.count]),
  );
  const divisionsWithCounts = divisions.map((d: any) => ({
    ...d,
    registeredCount: countMap.get(d._id.toString()) || 0,
  }));

  return NextResponse.json({
    event,
    divisions: divisionsWithCounts,
    leagueName: ctx.tenant.name,
  });
}

// ============================================================
// POST — submit registration (returning or new)
// ============================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const ctx = await getPublicLeagueTenant();
  if (!ctx) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const body = await req.json();
  const { models, tenantSlug: leagueSlug } = ctx;

  // Verify event is open
  const event = await models.Event.findOne({
    slug,
    status: "registration_open",
  })
    .select("_id name sport pricing divisionIds")
    .lean();
  if (!event) {
    return NextResponse.json(
      { error: "Event not found or registration is closed" },
      { status: 404 },
    );
  }
  const eventObj = event as any;
  const divisionIds = (eventObj.divisionIds || []).map((id: any) =>
    id.toString(),
  );

  // Validate teams array
  const teams: { teamId?: string; teamName: string; divisionId?: string }[] =
    body.teams;
  if (!Array.isArray(teams) || teams.length === 0) {
    return NextResponse.json(
      { error: "At least one team is required" },
      { status: 400 },
    );
  }
  for (const t of teams) {
    if (!t.teamName?.trim()) {
      return NextResponse.json(
        { error: "All teams must have a name" },
        { status: 400 },
      );
    }
    // Validate division if provided
    if (t.divisionId && !divisionIds.includes(t.divisionId)) {
      return NextResponse.json(
        { error: `Invalid division for team "${t.teamName}"` },
        { status: 400 },
      );
    }
  }

  // Check division capacity
  for (const t of teams) {
    if (t.divisionId) {
      const division = await models.Division.findById(t.divisionId)
        .select("maxTeams label")
        .lean();
      if (division) {
        const divDoc = division as any;
        if (divDoc.maxTeams) {
          const regCount = await models.Registration.countDocuments({
            eventId: eventObj._id,
            divisionId: new Types.ObjectId(t.divisionId),
            status: { $in: ["pending", "approved"] },
          });
          if (regCount >= divDoc.maxTeams) {
            return NextResponse.json(
              {
                error: `Division "${divDoc.label}" is full — cannot register "${t.teamName}"`,
              },
              { status: 409 },
            );
          }
        }
      }
    }
  }

  await connectPlatformDB();

  // ════════════════════════════════════════════════════
  // PATH A: Returning team
  // ════════════════════════════════════════════════════
  if (body.returning === true) {
    const { userId, orgTenantId } = body;
    if (!userId || !orgTenantId) {
      return NextResponse.json(
        { error: "Missing user or org info" },
        { status: 400 },
      );
    }

    // For new teams carried over from duplicate detection, create team records in org DB
    const tenant = await Tenant.findById(orgTenantId).select("slug").lean();
    let orgModelsForReturning: any = null;
    if (tenant && teams.some((t: any) => t.isNew)) {
      const orgConn = await connectTenantDB((tenant as any).slug, "organization");
      registerOrgModels(orgConn);
      orgModelsForReturning = getOrgModels(orgConn);
    }

    // Create registrations
    const registrations = [];
    for (const t of teams) {
      // Check if already registered (same team + same division = duplicate)
      const dupFilter: any = {
        eventId: eventObj._id,
        orgTenantId: new Types.ObjectId(orgTenantId),
        teamName: t.teamName,
        status: { $nin: ["withdrawn", "rejected"] },
      };
      if (t.divisionId) dupFilter.divisionId = new Types.ObjectId(t.divisionId);
      const existing = await models.Registration.findOne(dupFilter);
      if (existing) continue; // Skip true duplicates (same team + same division)

      let teamId = t.teamId ? new Types.ObjectId(t.teamId) : undefined;

      // Create team record in org DB for new teams
      if (t.isNew && orgModelsForReturning) {
        const divLabel = t.divisionId
          ? ((await models.Division.findById(t.divisionId).select("key").lean()) as any)?.key || "open"
          : "open";
        const teamDoc = await orgModelsForReturning.Team.create({
          name: t.teamName.trim(),
          divisionKey: divLabel,
          sport: eventObj.sport || "7v7_football",
          headCoachId: new Types.ObjectId(userId),
          coachIds: [new Types.ObjectId(userId)],
          managerIds: [],
          socials: {},
          isActive: true,
        });
        teamId = teamDoc._id;
      }

      const reg = await models.Registration.create({
        eventId: eventObj._id,
        divisionId: t.divisionId
          ? new Types.ObjectId(t.divisionId)
          : undefined,
        orgTenantId: new Types.ObjectId(orgTenantId),
        teamId,
        teamName: t.teamName.trim(),
        roster: [],
        status: "pending",
        paymentStatus: "unpaid",
        amountPaid: 0,
        registeredBy: new Types.ObjectId(userId),
      });
      registrations.push(reg);
    }

    // Handle payment for returning teams
    let checkoutUrl: string | undefined;
    const pricing = eventObj.pricing;

    if (pricing?.amount && pricing.amount > 0 && registrations.length > 0) {
      let perTeam = pricing.amount;
      const now = new Date();
      if (pricing.earlyBirdAmount && pricing.earlyBirdDeadline) {
        if (now < new Date(pricing.earlyBirdDeadline)) perTeam = pricing.earlyBirdAmount;
      }
      if (pricing.lateFeeAmount && pricing.lateFeeStartDate) {
        if (now >= new Date(pricing.lateFeeStartDate)) perTeam += pricing.lateFeeAmount;
      }
      if (pricing.multiTeamDiscounts?.length) {
        const applicable = pricing.multiTeamDiscounts
          .filter((d: any) => registrations.length >= d.minTeams)
          .sort((a: any, b: any) => b.minTeams - a.minTeams);
        if (applicable.length > 0) {
          const d = applicable[0];
          if (d.discountAmountPerTeam) perTeam = Math.max(0, perTeam - d.discountAmountPerTeam);
          else if (d.discountPercent) perTeam = Math.round(perTeam * (1 - d.discountPercent / 100));
        }
      }

      if (perTeam > 0) {
        await connectPlatformDB();
        const leagueTenant = await Tenant.findOne({ slug: ctx.tenantSlug }).lean();
        const stripeConfig = leagueTenant ? getTenantStripeConfig((leagueTenant as any).settings) : null;

        if (stripeConfig) {
          try {
            const stripe = getTenantStripe(stripeConfig.secretKey, ctx.tenantSlug);
            const baseUrl = process.env.NEXT_PUBLIC_LEAGUE_URL ||
              (process.env.NODE_ENV === "development" ? "http://localhost:4002" : `https://${ctx.tenantSlug}.goparticipate.com`);

            // Look up email from user
            const regUser = await User.findById(userId).select("email").lean();
            const userEmail = (regUser as any)?.email || "";

            const session = await stripe.checkout.sessions.create({
              mode: "payment",
              payment_method_types: ["card"],
              customer_email: userEmail,
              line_items: registrations.map((reg: any) => ({
                price_data: {
                  currency: "usd",
                  unit_amount: perTeam,
                  product_data: {
                    name: `${eventObj.name} — ${reg.teamName}`,
                    description: "Event registration fee",
                  },
                },
                quantity: 1,
              })),
              metadata: {
                eventId: eventObj._id.toString(),
                registrationIds: registrations.map((r: any) => r._id.toString()).join(","),
                tenantSlug: ctx.tenantSlug,
              },
              success_url: `${baseUrl}/public/events/${slug}?payment=success`,
              cancel_url: `${baseUrl}/public/events/${slug}/register?payment=cancelled`,
            });

            checkoutUrl = session.url || undefined;
            await models.Registration.updateMany(
              { _id: { $in: registrations.map((r) => r._id) } },
              { $set: { stripePaymentIntentId: session.id } },
            );
          } catch (err) {
            console.error("[registration] Stripe checkout failed:", err);
          }
        }
      }
    } else if (registrations.length > 0) {
      // Free event
      await models.Registration.updateMany(
        { _id: { $in: registrations.map((r) => r._id) } },
        { $set: { paymentStatus: "paid" } },
      );
    }

    return NextResponse.json({
      success: true,
      registrationIds: registrations.map((r) => r._id),
      teamCount: registrations.length,
      checkoutUrl,
    });
  }

  // ════════════════════════════════════════════════════
  // PATH B: New team
  // ════════════════════════════════════════════════════
  const { coachName, coachEmail, coachPhone, orgName, city, state } = body;
  if (!coachName || !coachEmail || !city || !state) {
    return NextResponse.json(
      { error: "Missing required contact fields" },
      { status: 400 },
    );
  }

  const emailLower = coachEmail.toLowerCase().trim();

  // --- Duplicate detection ---
  // 1. Check email
  const existingUser = await User.findOne({ email: emailLower }).lean();
  if (existingUser) {
    const existingMembership = (existingUser as any).memberships?.find(
      (m: any) => m.tenantType === "organization" && m.isActive,
    );
    if (existingMembership) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Use 'Played with us before' to sign in and register your teams.",
          existingMatch: emailLower,
        },
        { status: 409 },
      );
    }
  }

  // 2. Check phone
  if (coachPhone?.trim()) {
    const phoneUser = await User.findOne({
      phone: coachPhone.trim(),
    }).lean();
    if (phoneUser && phoneUser._id.toString() !== (existingUser as any)?._id?.toString()) {
      return NextResponse.json(
        {
          error:
            "This phone number is associated with an existing account. Use 'Played with us before' to sign in.",
          existingMatch: coachPhone.trim(),
        },
        { status: 409 },
      );
    }
  }

  // 3. Fuzzy org name check
  const displayName = (orgName || teams[0].teamName).trim();
  const existingOrg = await Tenant.findOne({
    name: { $regex: new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    tenantType: "organization",
  }).lean();
  if (existingOrg) {
    return NextResponse.json(
      {
        error: `An organization named "${displayName}" already exists. If this is your team, use 'Played with us before' to sign in.`,
        existingMatch: displayName,
      },
      { status: 409 },
    );
  }

  // --- Create user ---
  let userId: Types.ObjectId;
  if (existingUser) {
    // User exists but no org membership (e.g., was only a parent)
    userId = (existingUser as any)._id;
  } else {
    const newUser = await User.create({
      email: emailLower,
      name: coachName.trim(),
      phone: coachPhone?.trim() || undefined,
      memberships: [],
    });
    userId = newUser._id as Types.ObjectId;
  }

  // --- Create org tenant ---
  const baseSlug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let finalSlug = baseSlug;
  let attempt = 0;
  while (await Tenant.exists({ slug: finalSlug })) {
    attempt++;
    finalSlug = `${baseSlug}-${attempt}`;
  }

  const newTenant = await Tenant.create({
    name: displayName,
    slug: finalSlug,
    tenantType: "organization",
    owner: userId,
    sport: eventObj.sport || "7v7_football",
    status: "active",
    onboardingStep: 99,
    plan: { planId: "free", status: "active" },
    orgInfo: {
      city: city.trim(),
      state: state.trim().toUpperCase(),
      contactEmail: emailLower,
      contactPhone: coachPhone?.trim() || undefined,
      leagueIds: [],
    },
  });
  const tenantId = newTenant._id as Types.ObjectId;

  // Add membership
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        memberships: {
          tenantId,
          tenantSlug: finalSlug,
          tenantType: "organization",
          role: "head_coach",
          isActive: true,
          joinedAt: new Date(),
        },
      },
      $set: { activeTenantId: tenantId },
    },
  );

  // --- Create team records in org DB ---
  const orgConn = await connectTenantDB(finalSlug, "organization");
  registerOrgModels(orgConn);
  const orgModels = getOrgModels(orgConn);

  const teamRecords = [];
  for (const t of teams) {
    const divLabel =
      t.divisionId
        ? ((await models.Division.findById(t.divisionId).select("key").lean()) as any)?.key || "open"
        : "open";

    const teamDoc = await orgModels.Team.create({
      name: t.teamName.trim(),
      divisionKey: divLabel,
      sport: eventObj.sport || "7v7_football",
      headCoachId: userId,
      coachIds: [userId],
      managerIds: [],
      socials: {},
      isActive: true,
    });
    teamRecords.push({ teamDoc, divisionId: t.divisionId });
  }

  // --- Create registrations in league DB ---
  const registrations = [];
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    const teamDoc = teamRecords[i].teamDoc;
    const reg = await models.Registration.create({
      eventId: eventObj._id,
      divisionId: t.divisionId
        ? new Types.ObjectId(t.divisionId)
        : undefined,
      orgTenantId: tenantId,
      teamId: teamDoc._id,
      teamName: t.teamName.trim(),
      roster: [],
      status: "pending",
      paymentStatus: "unpaid",
      amountPaid: 0,
      registeredBy: userId,
      notes: `New registration. Coach: ${coachName} (${emailLower}). From ${city}, ${state}.`,
    });
    registrations.push(reg);
  }

  // Handle payment
  const pricing = eventObj.pricing;
  let checkoutUrl: string | undefined;

  if (pricing?.amount && pricing.amount > 0) {
    // Calculate effective per-team price
    const now = new Date();
    let perTeam = pricing.amount;
    if (pricing.earlyBirdAmount && pricing.earlyBirdDeadline) {
      if (now < new Date(pricing.earlyBirdDeadline)) perTeam = pricing.earlyBirdAmount;
    }
    if (pricing.lateFeeAmount && pricing.lateFeeStartDate) {
      if (now >= new Date(pricing.lateFeeStartDate)) perTeam += pricing.lateFeeAmount;
    }

    // Multi-team discount
    if (pricing.multiTeamDiscounts?.length) {
      const applicable = pricing.multiTeamDiscounts
        .filter((d: any) => teams.length >= d.minTeams)
        .sort((a: any, b: any) => b.minTeams - a.minTeams);
      if (applicable.length > 0) {
        const d = applicable[0];
        if (d.discountAmountPerTeam) perTeam = Math.max(0, perTeam - d.discountAmountPerTeam);
        else if (d.discountPercent) perTeam = Math.round(perTeam * (1 - d.discountPercent / 100));
      }
    }

    const totalAmount = perTeam * registrations.length;

    if (totalAmount > 0) {
      // Get league's Stripe config
      const leagueTenant = await Tenant.findOne({ slug: leagueSlug }).lean();
      const stripeConfig = leagueTenant ? getTenantStripeConfig((leagueTenant as any).settings) : null;

      if (stripeConfig) {
        try {
          const stripe = getTenantStripe(stripeConfig.secretKey, leagueSlug);
          const baseUrl = process.env.NEXT_PUBLIC_LEAGUE_URL ||
            (process.env.NODE_ENV === "development"
              ? "http://localhost:4002"
              : `https://${leagueSlug}.goparticipate.com`);

          const lineItems = registrations.map((reg: any) => ({
            price_data: {
              currency: "usd",
              unit_amount: perTeam,
              product_data: {
                name: `${eventObj.name} — ${reg.teamName}`,
                description: "Event registration fee",
              },
            },
            quantity: 1,
          }));

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: emailLower,
            line_items: lineItems,
            metadata: {
              eventId: eventObj._id.toString(),
              registrationIds: registrations.map((r: any) => r._id.toString()).join(","),
              tenantSlug: leagueSlug,
              teamCount: registrations.length.toString(),
            },
            success_url: `${baseUrl}/public/events/${slug}?payment=success`,
            cancel_url: `${baseUrl}/public/events/${slug}/register?payment=cancelled`,
          });

          checkoutUrl = session.url || undefined;

          // Store session ID on registrations
          await models.Registration.updateMany(
            { _id: { $in: registrations.map((r) => r._id) } },
            { $set: { stripePaymentIntentId: session.id } },
          );
        } catch (err) {
          console.error("[registration] Stripe checkout failed:", err);
          // Continue without payment — league admin can collect manually
        }
      }
    }
  } else {
    // Free event
    await models.Registration.updateMany(
      { _id: { $in: registrations.map((r) => r._id) } },
      { $set: { paymentStatus: "paid" } },
    );
  }

  // --- Send welcome email ---
  const dashboardUrl =
    process.env.NODE_ENV === "development"
      ? `http://localhost:4003`
      : `https://${finalSlug}.goparticipate.com`;

  try {
    await sendEmail({
      to: emailLower,
      subject: `Welcome to ${ctx.tenant.name} — ${event.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <h2 style="color:#1e293b;">Welcome to ${ctx.tenant.name}!</h2>
          <p>Hi ${coachName.trim().split(" ")[0]},</p>
          <p>Your ${teams.length === 1 ? "team has" : `${teams.length} teams have`} been registered for <strong>${eventObj.name}</strong>.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            ${teams.map((t) => `<p style="margin:4px 0;font-weight:600;">${t.teamName}</p>`).join("")}
          </div>
          <p>Your free team management dashboard is ready. From there you can:</p>
          <ul style="color:#475569;">
            <li>Manage your roster</li>
            <li>Invite parents &amp; players</li>
            <li>View your game schedule</li>
          </ul>
          <div style="text-align:center;margin:24px 0;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Dashboard
            </a>
          </div>
          <p style="font-size:13px;color:#94a3b8;">Use your email (${emailLower}) to sign in. You'll receive a one-time code — no password needed.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[registration] welcome email failed:", err);
  }

  return NextResponse.json({
    success: true,
    registrationIds: registrations.map((r) => r._id),
    teamCount: teams.length,
    dashboardSlug: finalSlug,
    checkoutUrl,
  });
}
