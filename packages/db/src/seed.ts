// Load root .env (seed runs standalone, not through Next.js)
import "../../config-env/load";

import mongoose from "mongoose";
import { connectPlatformDB, connectTenantDB } from "./connection";
import { Plan } from "./models/plan";
import { User } from "./models/user";
import { Tenant } from "./models/tenant";
import { getTenantModels } from "./models/tenant-models";

const AI_ADDONS = [
  {
    featureId: "ai_configurator",
    name: "AI Product Configurator",
    description:
      "AI-powered product configuration suggestions and automatic pricing optimization for your B2C storefront.",
    pricing: {
      monthly: 2900, // $29/mo
      stripePriceId: "",
    },
  },
  {
    featureId: "ai_mrp",
    name: "AI Inventory & MRP",
    description:
      "Intelligent demand forecasting, automatic reorder suggestions, and material requirements planning powered by AI.",
    pricing: {
      monthly: 4900, // $49/mo
      stripePriceId: "",
    },
  },
];

const PLANS = [
  {
    planId: "starter",
    name: "Starter",
    description:
      "Perfect for small meat shops and artisan producers just getting started with digital management.",
    features: [
      "Product catalog management",
      "Basic inventory tracking",
      "Single location",
      "Up to 5 users",
      "Email support",
      "Basic reporting",
      "Recipe management",
    ],
    limits: {
      users: 5,
      locations: 1,
      products: 50,
      ordersPerMonth: 100,
      storageGb: 5,
    },
    pricing: {
      monthly: 4900, // $49/mo
      annual: 47000, // ~$392/yr (save ~$196)
      stripePriceIdMonthly: "",
      stripePriceIdAnnual: "",
    },
    addOns: AI_ADDONS,
    isActive: true,
    sortOrder: 1,
  },
  {
    planId: "professional",
    name: "Professional",
    description:
      "For growing operations that need multi-location support, B2B/B2C sales, and advanced production tools.",
    features: [
      "Everything in Starter",
      "Multi-location support",
      "B2B quoting & invoicing",
      "B2C storefront",
      "Production batch tracking",
      "Supplier management",
      "Purchase orders",
      "Advanced reporting & analytics",
      "Priority email & chat support",
      "Up to 25 users",
    ],
    limits: {
      users: 25,
      locations: 5,
      products: 500,
      ordersPerMonth: 1000,
      storageGb: 25,
    },
    pricing: {
      monthly: 14900, // $149/mo
      annual: 143000, // ~$1192/yr (save ~$596)
      stripePriceIdMonthly: "",
      stripePriceIdAnnual: "",
    },
    addOns: AI_ADDONS,
    isActive: true,
    sortOrder: 2,
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description:
      "Full-featured platform for large-scale meat processing operations with unlimited capacity and dedicated support.",
    features: [
      "Everything in Professional",
      "Unlimited locations",
      "Unlimited users",
      "Custom integrations",
      "API access",
      "Dedicated account manager",
      "Phone support",
      "Custom branding",
      "SLA guarantee",
      "Advanced security & compliance",
      "Bulk import/export",
      "Audit logs",
    ],
    limits: {
      users: 999,
      locations: 999,
      products: 9999,
      ordersPerMonth: 99999,
      storageGb: 100,
    },
    pricing: {
      monthly: 39900, // $399/mo
      annual: 383000, // ~$3192/yr (save ~$1596)
      stripePriceIdMonthly: "",
      stripePriceIdAnnual: "",
    },
    addOns: AI_ADDONS,
    isActive: true,
    sortOrder: 3,
  },
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // --- Connect to Platform DB ---
  await connectPlatformDB();
  console.log("📡 Connected to platform database.\n");

  // --- Seed Plans ---
  console.log("📦 Seeding plans...");
  for (const planData of PLANS) {
    await Plan.findOneAndUpdate({ planId: planData.planId }, planData, {
      upsert: true,
      new: true,
    });
    console.log(`   ✓ Plan "${planData.name}" ($${planData.pricing.monthly / 100}/mo)`);
  }

  // --- Seed Super Admin User ---
  console.log("\n👤 Seeding super admin user...");
  let adminUser = await User.findOne({ email: "admin@illuminate.dev" });

  if (!adminUser) {
    adminUser = new User({
      email: "admin@illuminate.dev",
      name: "Super Admin",
      passwordHash: "admin123", // Will be hashed by pre-save hook
      platformRole: "saas_admin",
      emailVerified: new Date(),
      memberships: [],
    });
    await adminUser.save();
    console.log("   ✓ Created super admin (admin@illuminate.dev / admin123)");
  } else {
    console.log("   ✓ Super admin already exists, skipping.");
  }

  // --- Seed Sample Tenant (in platform DB) ---
  console.log("\n🏢 Seeding sample tenant...");
  let sampleTenant = await Tenant.findOne({ slug: "acme-meat-co" });

  if (!sampleTenant) {
    sampleTenant = new Tenant({
      name: "Acme Meat Co",
      slug: "acme-meat-co",
      owner: adminUser._id,
      plan: {
        planId: "professional",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        addOns: [],
      },
      settings: {
        branding: {
          primaryColor: "#DC2626",
          businessName: "Acme Meat Co",
        },
        features: {
          aiConfigurator: false,
          aiMrp: false,
          multiLocation: true,
          b2cStorefront: true,
        },
        notifications: {
          emailAlerts: true,
          lowStockThreshold: 10,
        },
      },
      locations: [
        {
          name: "Main Plant",
          address: {
            street: "123 Industrial Blvd",
            city: "Austin",
            state: "TX",
            zip: "78701",
            country: "US",
          },
          type: "production",
          isActive: true,
        },
        {
          name: "Downtown Store",
          address: {
            street: "456 Main St",
            city: "Austin",
            state: "TX",
            zip: "78702",
            country: "US",
          },
          type: "retail",
          isActive: true,
        },
      ],
      status: "active",
      onboardingStep: 999, // completed
    });
    await sampleTenant.save();
    console.log('   ✓ Created tenant "Acme Meat Co" on Professional plan');
  } else {
    console.log("   ✓ Sample tenant already exists, skipping.");
  }

  // --- Add admin as owner membership on the tenant ---
  const hasMembership = adminUser.memberships.some(
    (m) => m.tenantId.toString() === sampleTenant!._id.toString()
  );

  if (!hasMembership) {
    adminUser.memberships.push({
      tenantId: sampleTenant._id as mongoose.Types.ObjectId,
      role: "owner",
      locationAccess: [],
      permissions: [],
      isActive: true,
      joinedAt: new Date(),
    });
    adminUser.activeTenantId = sampleTenant._id as mongoose.Types.ObjectId;
    await adminUser.save();
    console.log("   ✓ Added admin as owner of Acme Meat Co");
  }

  // --- Seed sample data in tenant's own database ---
  console.log("\n🗄️  Connecting to tenant database (tenant_acme_meat_co)...");
  const tenantConn = await connectTenantDB("acme-meat-co");
  const models = getTenantModels(tenantConn);
  console.log("   ✓ Connected to tenant database.");

  // Seed a sample ingredient
  const existingIngredient = await models.Ingredient.findOne({ sku: "BRISKET-001" });
  if (!existingIngredient) {
    await models.Ingredient.create({
      name: "Whole Packer Brisket",
      sku: "BRISKET-001",
      category: "meat",
      unit: "lb",
      currentStock: 250,
      reorderPoint: 50,
      reorderQty: 100,
      cost: { perUnit: 599, lastUpdated: new Date() },
      allergens: [],
      storageRequirements: "refrigerated",
      isActive: true,
    });
    console.log('   ✓ Created sample ingredient "Whole Packer Brisket"');
  }

  // Seed a sample product
  const existingProduct = await models.Product.findOne({ sku: "SMKD-BRSK-001" });
  if (!existingProduct) {
    await models.Product.create({
      name: "Smoked Brisket",
      slug: "smoked-brisket",
      sku: "SMKD-BRSK-001",
      category: "beef",
      subcategory: "brisket",
      description: "Slow-smoked Texas-style brisket, 12-hour cook over post oak.",
      configurable: true,
      configOptions: [
        {
          name: "Size",
          type: "select",
          options: [
            { label: "Half (5-7 lbs)", value: "half", priceModifier: 0 },
            { label: "Full (12-15 lbs)", value: "full", priceModifier: 3500 },
          ],
          required: true,
        },
      ],
      pricing: {
        basePrice: 2499,
        unit: "lb",
        wholesalePrice: 1999,
        bulkPricing: [{ minQty: 10, pricePerUnit: 2199 }],
      },
      images: [],
      tags: ["bbq", "smoked", "texas"],
      isActive: true,
      availableOnStorefront: true,
    });
    console.log('   ✓ Created sample product "Smoked Brisket"');
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("   Platform DB: tenants, users, plans");
  console.log("   Tenant DB (acme-meat-co): sample product & ingredient\n");

  await tenantConn.close();
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  mongoose.disconnect();
  process.exit(1);
});
