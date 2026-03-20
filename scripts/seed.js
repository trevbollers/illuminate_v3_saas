// ============================================================================
// seed.js — Seed the Illuminate platform (run with mongosh)
// ============================================================================

const now = new Date();
const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

// --- Switch to platform DB ---
const platformDb = db.getSiblingDB('illuminate_platform');

// --- AI Add-ons ---
const AI_ADDONS = [
  {
    featureId: 'ai_configurator',
    name: 'AI Product Configurator',
    description: 'AI-powered product configuration suggestions and automatic pricing optimization for your B2C storefront.',
    pricing: { monthly: 2900, stripePriceId: '' }
  },
  {
    featureId: 'ai_mrp',
    name: 'AI Inventory & MRP',
    description: 'Intelligent demand forecasting, automatic reorder suggestions, and material requirements planning powered by AI.',
    pricing: { monthly: 4900, stripePriceId: '' }
  }
];

// --- Plans ---
print('Seeding plans...');
const plans = [
  {
    planId: 'starter',
    name: 'Starter',
    description: 'Perfect for small meat shops and artisan producers just getting started with digital management.',
    features: ['Product catalog management','Basic inventory tracking','Single location','Up to 5 users','Email support','Basic reporting','Recipe management'],
    limits: { users: 5, locations: 1, products: 50, ordersPerMonth: 100, storageGb: 5 },
    pricing: { monthly: 4900, annual: 47000, stripePriceIdMonthly: '', stripePriceIdAnnual: '' },
    addOns: AI_ADDONS, isActive: true, sortOrder: 1
  },
  {
    planId: 'professional',
    name: 'Professional',
    description: 'For growing operations that need multi-location support, B2B/B2C sales, and advanced production tools.',
    features: ['Everything in Starter','Multi-location support','B2B quoting & invoicing','B2C storefront','Production batch tracking','Supplier management','Purchase orders','Advanced reporting & analytics','Priority email & chat support','Up to 25 users'],
    limits: { users: 25, locations: 5, products: 500, ordersPerMonth: 1000, storageGb: 25 },
    pricing: { monthly: 14900, annual: 143000, stripePriceIdMonthly: '', stripePriceIdAnnual: '' },
    addOns: AI_ADDONS, isActive: true, sortOrder: 2
  },
  {
    planId: 'enterprise',
    name: 'Enterprise',
    description: 'Full-featured platform for large-scale meat processing operations with unlimited capacity and dedicated support.',
    features: ['Everything in Professional','Unlimited locations','Unlimited users','Custom integrations','API access','Dedicated account manager','Phone support','Custom branding','SLA guarantee','Advanced security & compliance','Bulk import/export','Audit logs'],
    limits: { users: 999, locations: 999, products: 9999, ordersPerMonth: 99999, storageGb: 100 },
    pricing: { monthly: 39900, annual: 383000, stripePriceIdMonthly: '', stripePriceIdAnnual: '' },
    addOns: AI_ADDONS, isActive: true, sortOrder: 3
  }
];

for (const plan of plans) {
  platformDb.plans.updateOne(
    { planId: plan.planId },
    { $set: plan, $setOnInsert: { createdAt: now, updatedAt: now } },
    { upsert: true }
  );
  print('   ok Plan: ' + plan.name + ' ($' + (plan.pricing.monthly / 100) + '/mo)');
}

// --- Super Admin User ---
print('');
print('Seeding super admin user...');
const existingAdmin = platformDb.users.findOne({ email: 'admin@illuminate.dev' });

let adminId;
if (!existingAdmin) {
  const result = platformDb.users.insertOne({
    email: 'admin@illuminate.dev',
    name: 'Super Admin',
    passwordHash: '$2a$12$xlRsO1/PlZejgrigOS1wa.u1xyU1Zw88fcP9L7bAkf.GhQjQ6O612',
    platformRole: 'saas_admin',
    emailVerified: now,
    memberships: [],
    createdAt: now,
    updatedAt: now
  });
  adminId = result.insertedId;
  print('   ok Created super admin (admin@illuminate.dev / admin123)');
} else {
  adminId = existingAdmin._id;
  print('   ok Super admin already exists, skipping.');
}

// --- Sample Tenant ---
print('');
print('Seeding sample tenant...');
const existingTenant = platformDb.tenants.findOne({ slug: 'acme-meat-co' });

let tenantId;
if (!existingTenant) {
  const result = platformDb.tenants.insertOne({
    name: 'Acme Meat Co',
    slug: 'acme-meat-co',
    owner: adminId,
    plan: {
      planId: 'professional',
      status: 'active',
      currentPeriodEnd: thirtyDaysFromNow,
      addOns: []
    },
    settings: {
      branding: { primaryColor: '#DC2626', businessName: 'Acme Meat Co' },
      features: { aiConfigurator: false, aiMrp: false, multiLocation: true, b2cStorefront: true },
      notifications: { emailAlerts: true, lowStockThreshold: 10 }
    },
    locations: [
      {
        _id: new ObjectId(),
        name: 'Main Plant',
        address: { street: '123 Industrial Blvd', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
        type: 'production', isActive: true
      },
      {
        _id: new ObjectId(),
        name: 'Downtown Store',
        address: { street: '456 Main St', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
        type: 'retail', isActive: true
      }
    ],
    status: 'active',
    onboardingStep: 999,
    createdAt: now,
    updatedAt: now
  });
  tenantId = result.insertedId;
  print('   ok Created tenant "Acme Meat Co" on Professional plan');
} else {
  tenantId = existingTenant._id;
  print('   ok Sample tenant already exists, skipping.');
}

// --- Add admin membership ---
const adminUser = platformDb.users.findOne({ _id: adminId });
const hasMembership = (adminUser.memberships || []).some(
  m => m.tenantId.toString() === tenantId.toString()
);

if (!hasMembership) {
  platformDb.users.updateOne(
    { _id: adminId },
    {
      $push: {
        memberships: {
          tenantId: tenantId,
          role: 'owner',
          locationAccess: [],
          permissions: [],
          isActive: true,
          joinedAt: now
        }
      },
      $set: { activeTenantId: tenantId, updatedAt: now }
    }
  );
  print('   ok Added admin as owner of Acme Meat Co');
}

print('');
print('Platform DB seeded!');

// --- Tenant database ---
print('');
print('Seeding tenant database (tenant_acme_meat_co)...');
const tenantDb = db.getSiblingDB('tenant_acme_meat_co');

if (!tenantDb.ingredients.findOne({ sku: 'BRISKET-001' })) {
  tenantDb.ingredients.insertOne({
    name: 'Whole Packer Brisket',
    sku: 'BRISKET-001',
    category: 'meat',
    unit: 'lb',
    currentStock: 250,
    reorderPoint: 50,
    reorderQty: 100,
    cost: { perUnit: 599, lastUpdated: now },
    allergens: [],
    storageRequirements: 'refrigerated',
    isActive: true,
    createdAt: now,
    updatedAt: now
  });
  print('   ok Created sample ingredient "Whole Packer Brisket"');
} else {
  print('   ok Sample ingredient already exists, skipping.');
}

if (!tenantDb.products.findOne({ sku: 'SMKD-BRSK-001' })) {
  tenantDb.products.insertOne({
    name: 'Smoked Brisket',
    slug: 'smoked-brisket',
    sku: 'SMKD-BRSK-001',
    category: 'beef',
    subcategory: 'brisket',
    description: 'Slow-smoked Texas-style brisket, 12-hour cook over post oak.',
    configurable: true,
    configOptions: [
      {
        name: 'Size',
        type: 'select',
        options: [
          { label: 'Half (5-7 lbs)', value: 'half', priceModifier: 0 },
          { label: 'Full (12-15 lbs)', value: 'full', priceModifier: 3500 }
        ],
        required: true
      }
    ],
    pricing: {
      basePrice: 2499,
      unit: 'lb',
      wholesalePrice: 1999,
      bulkPricing: [{ minQty: 10, pricePerUnit: 2199 }]
    },
    images: [],
    tags: ['bbq', 'smoked', 'texas'],
    isActive: true,
    availableOnStorefront: true,
    createdAt: now,
    updatedAt: now
  });
  print('   ok Created sample product "Smoked Brisket"');
} else {
  print('   ok Sample product already exists, skipping.');
}

print('');
print('=== Seed complete ===');
print('   Platform DB: plans, admin user, sample tenant');
print('   Tenant DB: sample product & ingredient');
print('   Login: admin@illuminate.dev / admin123');
