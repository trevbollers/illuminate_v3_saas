#!/usr/bin/env bash
# ============================================================================
# seed.sh — Seed the Illuminate platform via docker exec mongosh
#
# Usage:  bash scripts/seed.sh
# ============================================================================

set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-illuminate-mongodb}"
MONGO_URI="mongodb://illuminate:illuminate_dev@localhost:27017/illuminate_platform?authSource=admin"
TENANT_URI="mongodb://illuminate:illuminate_dev@localhost:27017/tenant_acme_meat_co?authSource=admin"

echo "=== Illuminate Database Seed ==="
echo ""

# --- Seed platform database ---
echo "Seeding platform database..."

docker exec "$CONTAINER" mongosh "$MONGO_URI" --quiet --eval '
var now = new Date();
var thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

var AI_ADDONS = [
  { featureId: "ai_configurator", name: "AI Product Configurator", description: "AI-powered product configuration suggestions and automatic pricing optimization for your B2C storefront.", pricing: { monthly: 2900, stripePriceId: "" } },
  { featureId: "ai_mrp", name: "AI Inventory & MRP", description: "Intelligent demand forecasting, automatic reorder suggestions, and material requirements planning powered by AI.", pricing: { monthly: 4900, stripePriceId: "" } }
];

var plans = [
  { planId: "beginner", name: "Beginner", description: "Free forever — get started with the basics. No credit card required.", features: ["1 user","1 location","Up to 25 products","Basic inventory tracking","Order management","Email support"], limits: { users: 1, locations: 1, products: 25, ordersPerMonth: 50, storageGb: 1 }, pricing: { monthly: 0, annual: 0, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: [], isActive: true, sortOrder: 0 },
  { planId: "starter", name: "Starter", description: "Perfect for small meat shops and artisan producers just getting started with digital management.", features: ["Product catalog management","Basic inventory tracking","Single location","Up to 5 users","Email support","Basic reporting","Recipe management"], limits: { users: 5, locations: 1, products: 50, ordersPerMonth: 100, storageGb: 5 }, pricing: { monthly: 4900, annual: 47000, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 4900 },
  { planId: "professional", name: "Professional", description: "For growing operations that need multi-location support, B2B/B2C sales, and advanced production tools.", features: ["Everything in Starter","Multi-location support","B2B quoting & invoicing","B2C storefront","Production batch tracking","Supplier management","Purchase orders","Advanced reporting & analytics","Priority email & chat support","Up to 25 users"], limits: { users: 25, locations: 5, products: 500, ordersPerMonth: 1000, storageGb: 25 }, pricing: { monthly: 14900, annual: 143000, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 14900 },
  { planId: "enterprise", name: "Enterprise", description: "Full-featured platform for large-scale meat processing operations with unlimited capacity and dedicated support.", features: ["Everything in Professional","Unlimited locations","Unlimited users","Custom integrations","API access","Dedicated account manager","Phone support","Custom branding","SLA guarantee","Advanced security & compliance","Bulk import/export","Audit logs"], limits: { users: 999, locations: 999, products: 9999, ordersPerMonth: 99999, storageGb: 100 }, pricing: { monthly: 39900, annual: 383000, stripePriceIdMonthly: "", stripePriceIdAnnual: "" }, addOns: AI_ADDONS, isActive: true, sortOrder: 39900 }
];

for (var i = 0; i < plans.length; i++) {
  db.plans.updateOne({ planId: plans[i].planId }, { $set: plans[i], $setOnInsert: { createdAt: now, updatedAt: now } }, { upsert: true });
  print("   ok Plan: " + plans[i].name + " ($" + (plans[i].pricing.monthly / 100) + "/mo)");
}

print("");
print("Seeding super admin user...");
var existingAdmin = db.users.findOne({ email: "admin@illuminate.dev" });
var adminId;
if (!existingAdmin) {
  var r = db.users.insertOne({ email: "admin@illuminate.dev", name: "Super Admin", passwordHash: "$2a$12$xlRsO1/PlZejgrigOS1wa.u1xyU1Zw88fcP9L7bAkf.GhQjQ6O612", platformRole: "saas_admin", emailVerified: now, memberships: [], createdAt: now, updatedAt: now });
  adminId = r.insertedId;
  print("   ok Created super admin (admin@illuminate.dev / admin123)");
} else {
  adminId = existingAdmin._id;
  print("   ok Super admin already exists, skipping.");
}

print("");
print("Seeding sample tenant...");
var existingTenant = db.tenants.findOne({ slug: "acme-meat-co" });
var tenantId;
if (!existingTenant) {
  var r2 = db.tenants.insertOne({ name: "Acme Meat Co", slug: "acme-meat-co", owner: adminId, plan: { planId: "professional", status: "active", currentPeriodEnd: thirtyDays, addOns: [] }, settings: { branding: { primaryColor: "#DC2626", businessName: "Acme Meat Co" }, features: { aiConfigurator: false, aiMrp: false, multiLocation: true, b2cStorefront: true }, notifications: { emailAlerts: true, lowStockThreshold: 10 } }, locations: [ { _id: new ObjectId(), name: "Main Plant", address: { street: "123 Industrial Blvd", city: "Austin", state: "TX", zip: "78701", country: "US" }, type: "production", isActive: true }, { _id: new ObjectId(), name: "Downtown Store", address: { street: "456 Main St", city: "Austin", state: "TX", zip: "78702", country: "US" }, type: "retail", isActive: true } ], status: "active", onboardingStep: 999, createdAt: now, updatedAt: now });
  tenantId = r2.insertedId;
  print("   ok Created tenant Acme Meat Co on Professional plan");
} else {
  tenantId = existingTenant._id;
  print("   ok Sample tenant already exists, skipping.");
}

var adminUser = db.users.findOne({ _id: adminId });
var hasMembership = (adminUser.memberships || []).some(function(m) { return m.tenantId.toString() === tenantId.toString(); });
if (!hasMembership) {
  db.users.updateOne({ _id: adminId }, { $push: { memberships: { tenantId: tenantId, role: "owner", locationAccess: [], permissions: [], isActive: true, joinedAt: now } }, $set: { activeTenantId: tenantId, updatedAt: now } });
  print("   ok Added admin as owner of Acme Meat Co");
}

print("");
print("Platform DB seeded!");
'

# --- Seed tenant database ---
echo ""
echo "Seeding tenant database (tenant_acme_meat_co)..."

docker exec "$CONTAINER" mongosh "$TENANT_URI" --quiet --eval '
var now = new Date();

if (!db.ingredients.findOne({ sku: "BRISKET-001" })) {
  db.ingredients.insertOne({ name: "Whole Packer Brisket", sku: "BRISKET-001", category: "meat", unit: "lb", currentStock: 250, reorderPoint: 50, reorderQty: 100, cost: { perUnit: 599, lastUpdated: now }, allergens: [], storageRequirements: "refrigerated", isActive: true, createdAt: now, updatedAt: now });
  print("   ok Created sample ingredient Whole Packer Brisket");
} else {
  print("   ok Sample ingredient already exists, skipping.");
}

if (!db.products.findOne({ sku: "SMKD-BRSK-001" })) {
  db.products.insertOne({ name: "Smoked Brisket", slug: "smoked-brisket", sku: "SMKD-BRSK-001", category: "beef", subcategory: "brisket", description: "Slow-smoked Texas-style brisket, 12-hour cook over post oak.", configurable: true, configOptions: [ { name: "Size", type: "select", options: [ { label: "Half (5-7 lbs)", value: "half", priceModifier: 0 }, { label: "Full (12-15 lbs)", value: "full", priceModifier: 3500 } ], required: true } ], pricing: { basePrice: 2499, unit: "lb", wholesalePrice: 1999, bulkPricing: [{ minQty: 10, pricePerUnit: 2199 }] }, images: [], tags: ["bbq", "smoked", "texas"], isActive: true, availableOnStorefront: true, createdAt: now, updatedAt: now });
  print("   ok Created sample product Smoked Brisket");
} else {
  print("   ok Sample product already exists, skipping.");
}

print("");
print("Tenant DB seeded!");
'

echo ""
echo "=== Seed complete ==="
echo "   Platform DB: plans, admin user, sample tenant"
echo "   Tenant DB: sample product & ingredient"
echo ""
echo "   Login: admin@illuminate.dev / admin123"
