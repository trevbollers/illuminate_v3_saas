import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { connectPlatformDB, connectTenantDB, User, Tenant } from "@illuminate/db";
import { sendEmail, VerifyEmail } from "@illuminate/email";
import { createCheckoutSession } from "@illuminate/billing";

const VALID_PLANS = ["beginner", "starter", "professional", "enterprise"];
const FREE_PLANS = ["beginner"];

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
  if (!slug) slug = "business";

  const existing = await Tenant.findOne({ slug });
  if (!existing) return slug;

  // Append random suffix if slug is taken
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, businessName, email, password, plan } = body;

    console.log("[register] Incoming registration request:", {
      fullName,
      businessName,
      email,
      plan,
      hasPassword: !!password,
    });

    if (!fullName || !businessName || !email || !password) {
      console.warn("[register] Missing required fields:", {
        fullName: !!fullName,
        businessName: !!businessName,
        email: !!email,
        password: !!password,
      });
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (!plan || !VALID_PLANS.includes(plan)) {
      console.warn("[register] Invalid plan:", plan);
      return NextResponse.json(
        { error: "Please select a valid plan." },
        { status: 400 },
      );
    }

    console.log("[register] Connecting to platform DB...");
    await connectPlatformDB();
    console.log("[register] Connected to platform DB");

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.warn("[register] User already exists:", email);
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Create the user (password hashing happens via pre-save hook)
    console.log("[register] Creating user...");
    const user = await User.create({
      email: email.toLowerCase(),
      name: fullName,
      passwordHash: password,
      memberships: [],
    });
    console.log("[register] User created:", user._id.toString());

    // Free plans are immediately active; paid plans start as trialing
    const isFree = FREE_PLANS.includes(plan);

    // Create the tenant
    const slug = await generateUniqueSlug(businessName);
    console.log("[register] Creating tenant with slug:", slug);
    const tenant = await Tenant.create({
      name: businessName,
      slug,
      owner: user._id,
      plan: {
        planId: plan,
        status: isFree ? "active" : "trialing",
        addOns: [],
      },
      settings: {
        branding: { businessName },
        features: {
          aiConfigurator: false,
          aiMrp: false,
          multiLocation: false,
          b2cStorefront: false,
        },
        notifications: {
          emailAlerts: true,
          lowStockThreshold: 10,
        },
      },
      locations: [],
      status: "onboarding",
      onboardingStep: 0,
    });
    console.log("[register] Tenant created:", tenant._id.toString(), "slug:", slug);

    // Add membership to the user
    user.memberships.push({
      tenantId: tenant._id,
      role: "owner",
      locationAccess: [],
      permissions: [],
      isActive: true,
      joinedAt: new Date(),
    });
    user.activeTenantId = tenant._id;
    await user.save();
    console.log("[register] User membership updated, activeTenantId:", tenant._id.toString());

    // Initialize the tenant's isolated database
    try {
      await connectTenantDB(slug);
      console.log("[register] Tenant DB initialized for slug:", slug);
    } catch (dbErr) {
      // Non-blocking — tenant DB will be created on first access if this fails
      console.error("[register] Failed to initialize tenant DB:", dbErr);
    }

    // Send verification email
    const token = generateVerifyToken(user._id.toString());
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await sendEmail({
        to: email,
        subject: "Verify your Illuminate account",
        react: VerifyEmail({ name: fullName, verifyUrl }),
      });
      console.log("[register] Verification email sent to:", email);
    } catch (emailErr) {
      // Non-blocking — user is created, email failure shouldn't fail registration
      console.error("[register] Failed to send verification email:", emailErr);
    }

    // Free plans go straight to the app
    if (isFree) {
      console.log("[register] Registration complete (free plan) for:", email);
      return NextResponse.json({ checkoutUrl: null }, { status: 201 });
    }

    // Paid plans: create Stripe checkout session and return the redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3002";

    try {
      const checkoutSession = await createCheckoutSession({
        planId: plan,
        billingInterval: "monthly",
        tenantId: tenant._id.toString(),
        userId: user._id.toString(),
        email: email.toLowerCase(),
        successUrl: `${dashboardUrl}?checkout=success`,
        cancelUrl: `${appUrl}/register?plan=${plan}&checkout=cancelled`,
      });
      console.log("[register] Stripe checkout session created for:", email);
      return NextResponse.json({ checkoutUrl: checkoutSession.url }, { status: 201 });
    } catch (stripeErr) {
      console.error("[register] Failed to create Stripe checkout session:", stripeErr);
      // Registration succeeded — return null checkout URL so client can still proceed
      return NextResponse.json({ checkoutUrl: null }, { status: 201 });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[register] Registration failed:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
      // Mongoose validation errors have an `errors` property
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
