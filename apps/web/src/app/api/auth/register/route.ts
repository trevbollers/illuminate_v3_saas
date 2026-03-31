import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { Types } from "mongoose";
import { connectPlatformDB, connectTenantDB, User, Tenant } from "@goparticipate/db";
import { sendEmail, VerifyEmail } from "@goparticipate/email";
import { createCheckoutSession } from "@goparticipate/billing";

// Plans that don't require Stripe checkout
const FREE_PLAN_IDS = ["free", "family_free"];

// Valid org plan IDs (mapped from signup form)
const VALID_ORG_PLANS = ["free", "team_pro", "partner", "organization"];

function generateVerifyToken(userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
  const secret = process.env.EMAIL_VERIFY_SECRET ?? "fallback-secret";
  const payload = `${userId}:${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = slugify(baseName);
  if (!slug) slug = "tenant";

  const existing = await Tenant.findOne({ slug });
  if (!existing) return slug;

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, fullName, email, password } = body;

    // ── Validate common fields ───────────────────────────────────────────
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (!role || !["league", "org", "family"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid signup type." },
        { status: 400 },
      );
    }

    await connectPlatformDB();

    // Check for existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // ── FAMILY signup — create user + family DB ──────────────────────────
    if (role === "family") {
      const familyId = new Types.ObjectId();

      const user = await User.create({
        email: email.toLowerCase(),
        name: fullName,
        passwordHash: password,
        memberships: [],
        familyId,
      });

      // Create the family database with profile + guardian
      try {
        const { connectFamilyDB, getFamilyModels } = await import("@goparticipate/db");
        const famConn = await connectFamilyDB(familyId.toString());
        const famModels = getFamilyModels(famConn);

        await famModels.FamilyProfile.create({
          familyName: `${fullName}'s Family`,
          primaryUserId: user._id,
          address: {},
          orgConnections: [],
          leagueConnections: [],
          programHistory: [],
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            shareVerificationAcrossLeagues: true,
          },
        });

        await famModels.FamilyGuardian.create({
          userId: user._id,
          name: fullName,
          email: email.toLowerCase(),
          relationship: "guardian",
          isPrimary: true,
          canMakeDecisions: true,
          playerIds: [],
        });
      } catch (err) {
        console.error("[register] Failed to create family DB:", err);
      }

      await sendVerificationEmail(user._id.toString(), fullName, email);

      return NextResponse.json({ checkoutUrl: null, familyId: familyId.toString() }, { status: 201 });
    }

    // ── LEAGUE signup ────────────────────────────────────────────────────
    if (role === "league") {
      const { tenantName, region, sport } = body;
      if (!tenantName) {
        return NextResponse.json(
          { error: "League name is required." },
          { status: 400 },
        );
      }

      const user = await User.create({
        email: email.toLowerCase(),
        name: fullName,
        passwordHash: password,
        memberships: [],
      });

      const slug = await generateUniqueSlug(tenantName);
      const tenant = await Tenant.create({
        name: tenantName,
        slug,
        tenantType: "league",
        owner: user._id,
        plan: {
          planId: "league",
          status: "trialing",
          addOns: [],
        },
        settings: {
          branding: { displayName: tenantName },
          features: {
            aiCoachAssistant: false,
            liveScoring: true,
            playerDevelopment: false,
            storefront: false,
          },
          notifications: { emailAlerts: true, pushNotifications: true },
        },
        sport: sport || "7v7_football",
        status: "onboarding",
        onboardingStep: 0,
        leagueInfo: {
          region: region || undefined,
        },
      });

      user.memberships.push({
        tenantId: tenant._id,
        tenantType: "league",
        role: "league_owner",
        teamIds: [],
        permissions: [],
        isActive: true,
        joinedAt: new Date(),
      });
      user.activeTenantId = tenant._id;
      await user.save();

      // Initialize league DB
      try {
        await connectTenantDB(slug, "league");
      } catch (dbErr) {
        console.error("[register] Failed to initialize league DB:", dbErr);
      }

      await sendVerificationEmail(user._id.toString(), fullName, email);

      // League is always paid → Stripe checkout
      return await handlePaidCheckout(
        "league",
        tenant._id.toString(),
        user._id.toString(),
        email,
        slug,
      );
    }

    // ── ORG signup ───────────────────────────────────────────────────────
    const { tenantName, sport, plan } = body;
    if (!tenantName) {
      return NextResponse.json(
        { error: "Team/org name is required." },
        { status: 400 },
      );
    }
    if (!plan || !VALID_ORG_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: "Please select a valid plan." },
        { status: 400 },
      );
    }

    const user = await User.create({
      email: email.toLowerCase(),
      name: fullName,
      passwordHash: password,
      memberships: [],
    });

    const slug = await generateUniqueSlug(tenantName);
    const isFree = FREE_PLAN_IDS.includes(plan);

    const tenant = await Tenant.create({
      name: tenantName,
      slug,
      tenantType: "organization",
      owner: user._id,
      plan: {
        planId: plan,
        status: isFree ? "active" : "trialing",
        addOns: [],
      },
      settings: {
        branding: { displayName: tenantName },
        features: {
          aiCoachAssistant: false,
          liveScoring: false,
          playerDevelopment: false,
          storefront: false,
        },
        notifications: { emailAlerts: true, pushNotifications: true },
      },
      sport: sport || "7v7_football",
      status: "onboarding",
      onboardingStep: 0,
    });

    user.memberships.push({
      tenantId: tenant._id,
      tenantType: "organization",
      role: "org_owner",
      teamIds: [],
      permissions: [],
      isActive: true,
      joinedAt: new Date(),
    });
    user.activeTenantId = tenant._id;
    await user.save();

    // Initialize org DB
    try {
      await connectTenantDB(slug, "organization");
    } catch (dbErr) {
      console.error("[register] Failed to initialize org DB:", dbErr);
    }

    await sendVerificationEmail(user._id.toString(), fullName, email);

    if (isFree) {
      return NextResponse.json({ checkoutUrl: null }, { status: 201 });
    }

    return await handlePaidCheckout(
      plan,
      tenant._id.toString(),
      user._id.toString(),
      email,
      slug,
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[register] Registration failed:", {
      message: err.message,
      stack: err.stack,
      ...(typeof (error as any)?.errors === "object" && {
        validationErrors: Object.entries((error as any).errors).map(
          ([field, e]: [string, any]) => ({
            field,
            message: e.message,
            kind: e.kind,
            value: e.value,
          }),
        ),
      }),
    });
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sendVerificationEmail(userId: string, name: string, email: string) {
  const token = generateVerifyToken(userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
  const verifyUrl = `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    await sendEmail({
      to: email,
      subject: "Verify your Go Participate account",
      react: VerifyEmail({ name, verifyUrl }),
    });
  } catch (emailErr) {
    console.error("[register] Failed to send verification email:", emailErr);
  }
}

async function handlePaidCheckout(
  planId: string,
  tenantId: string,
  userId: string,
  email: string,
  _slug: string,
) {
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:4003";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";

  try {
    const checkoutSession = await createCheckoutSession({
      planId,
      billingInterval: "monthly",
      tenantId,
      userId,
      email: email.toLowerCase(),
      successUrl: `${dashboardUrl}?checkout=success`,
      cancelUrl: `${appUrl}/signup?checkout=cancelled`,
    });
    return NextResponse.json({ checkoutUrl: checkoutSession.url }, { status: 201 });
  } catch (stripeErr) {
    console.error("[register] Failed to create Stripe checkout session:", stripeErr);
    return NextResponse.json({ checkoutUrl: null }, { status: 201 });
  }
}
