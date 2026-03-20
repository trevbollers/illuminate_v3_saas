import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, User, Tenant } from "@illuminate/db";

const VALID_PLANS = ["beginner", "starter", "professional", "enterprise"];
const FREE_PLANS = ["beginner", "starter"];

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

    // Free plans go straight to the app; paid plans would go to Stripe checkout
    if (isFree) {
      console.log("[register] Registration complete (free plan) for:", email);
      return NextResponse.json({ checkoutUrl: null }, { status: 201 });
    }

    // TODO: Create Stripe checkout session for paid plans and return checkoutUrl
    // For now, allow registration without payment
    console.log("[register] Registration complete (paid plan, no checkout yet) for:", email);
    return NextResponse.json({ checkoutUrl: null }, { status: 201 });
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
