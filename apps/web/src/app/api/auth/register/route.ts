import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, User, Tenant } from "@illuminate/db";

const VALID_PLANS = ["starter", "professional", "enterprise"];
const FREE_PLANS = ["starter"];

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

    if (!fullName || !businessName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: "Please select a valid plan." },
        { status: 400 },
      );
    }

    await connectPlatformDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    // Create the user (password hashing happens via pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      name: fullName,
      passwordHash: password,
      memberships: [],
    });

    // Free plans are immediately active; paid plans start as trialing
    const isFree = FREE_PLANS.includes(plan);

    // Create the tenant
    const slug = await generateUniqueSlug(businessName);
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

    // Free plans go straight to the app; paid plans would go to Stripe checkout
    if (isFree) {
      return NextResponse.json({ checkoutUrl: null }, { status: 201 });
    }

    // TODO: Create Stripe checkout session for paid plans and return checkoutUrl
    // For now, allow registration without payment
    return NextResponse.json({ checkoutUrl: null }, { status: 201 });
  } catch (error) {
    console.error("[register] Registration failed:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
