# Database Schema — Database-Per-Tenant Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   MongoDB Atlas Cluster                         │
│                                                                 │
│  ┌─────────────────────────┐                                    │
│  │ illuminate_platform     │  ← SaaS platform database          │
│  │ ├── tenants             │                                    │
│  │ ├── users               │                                    │
│  │ ├── plans               │                                    │
│  │ └── feature_flags       │                                    │
│  └─────────────────────────┘                                    │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ tenant_acme_meat_co     │  │ tenant_bobs_bbq         │  ...  │
│  │ ├── products            │  │ ├── products            │       │
│  │ ├── recipes             │  │ ├── recipes             │       │
│  │ ├── ingredients         │  │ ├── ingredients         │       │
│  │ ├── inventorytxns       │  │ ├── inventorytxns       │       │
│  │ ├── suppliers           │  │ ├── suppliers           │       │
│  │ ├── purchaseorders      │  │ ├── purchaseorders      │       │
│  │ ├── salesorders         │  │ ├── salesorders         │       │
│  │ └── productionbatches   │  │ └── productionbatches   │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

Tenant databases are named `tenant_<slug>` where `<slug>` is the tenant's
URL-safe slug with hyphens replaced by underscores.

## Platform Database: `illuminate_platform`

### tenants
```javascript
{
  _id: ObjectId,
  name: String,                    // "Acme Meat Co"
  slug: String,                    // "acme-meat-co" (unique, used for subdomain + DB name)
  customDomain: String,            // "app.acmemeat.com" (optional)
  owner: ObjectId,                 // ref: users
  plan: {
    planId: String,                // "starter" | "professional" | "enterprise"
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: String,                // "trialing" | "active" | "past_due" | "canceled"
    currentPeriodEnd: Date,
    addOns: [{
      featureId: String,           // "ai_configurator" | "ai_mrp"
      stripeItemId: String,
      status: String
    }]
  },
  settings: {
    branding: {
      logo: String,
      primaryColor: String,
      businessName: String
    },
    features: {
      aiConfigurator: Boolean,
      aiMrp: Boolean,
      multiLocation: Boolean,
      b2cStorefront: Boolean
    },
    notifications: {
      emailAlerts: Boolean,
      lowStockThreshold: Number
    }
  },
  locations: [{
    _id: ObjectId,
    name: String,                  // "Main Plant", "Downtown Store"
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    type: String,                  // "production" | "retail" | "warehouse"
    isActive: Boolean
  }],
  status: String,                  // "active" | "suspended" | "onboarding"
  onboardingStep: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### users
```javascript
{
  _id: ObjectId,
  email: String,                   // unique
  emailVerified: Date,
  passwordHash: String,
  name: String,
  image: String,
  phone: String,

  // Platform role (super admin only)
  platformRole: String,            // "super_admin" | null

  // Tenant memberships (a user can belong to multiple tenants)
  memberships: [{
    tenantId: ObjectId,            // ref: tenants
    role: String,                  // "owner" | "admin" | "manager" | "staff" | "viewer"
    locationAccess: [ObjectId],    // which locations they can access (empty = all)
    permissions: [String],         // granular overrides
    isActive: Boolean,
    joinedAt: Date
  }],

  // Active tenant context
  activeTenantId: ObjectId,

  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### plans
```javascript
{
  _id: ObjectId,
  planId: String,                  // "starter" | "professional" | "enterprise"
  name: String,
  description: String,
  features: [String],
  limits: {
    users: Number,                 // max users per tenant
    locations: Number,             // max locations
    products: Number,              // max products
    ordersPerMonth: Number,
    storageGb: Number
  },
  pricing: {
    monthly: Number,               // in cents
    annual: Number,                // in cents (per year)
    stripePriceIdMonthly: String,
    stripePriceIdAnnual: String
  },
  addOns: [{
    featureId: String,
    name: String,
    description: String,
    pricing: {
      monthly: Number,
      stripePriceId: String
    }
  }],
  isActive: Boolean,
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### feature_flags
```javascript
{
  _id: ObjectId,
  key: String,                     // "ai_configurator_v2"
  name: String,
  description: String,
  enabled: Boolean,                // global kill switch
  rollout: {
    type: String,                  // "all" | "percentage" | "tenant_list" | "plan_based"
    percentage: Number,
    tenantIds: [ObjectId],
    plans: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Tenant Databases: `tenant_<slug>`

> Each tenant gets their own database. Collections below have **NO `tenantId`
> field** — isolation is enforced at the database/connection level.

### products
```javascript
{
  _id: ObjectId,
  name: String,                    // "Smoked Brisket"
  slug: String,                    // unique within this tenant DB
  sku: String,                     // unique within this tenant DB
  category: String,                // "beef" | "pork" | "poultry" | "specialty"
  subcategory: String,             // "brisket" | "ribs" | "sausage"
  description: String,

  configurable: Boolean,
  configOptions: [{
    name: String,                  // "Size", "Thickness", "Seasoning"
    type: String,                  // "select" | "range" | "toggle"
    options: [{
      label: String,
      value: String,
      priceModifier: Number        // in cents, added to base price
    }],
    required: Boolean
  }],

  pricing: {
    basePrice: Number,             // in cents
    unit: String,                  // "lb" | "kg" | "each" | "case"
    wholesalePrice: Number,
    bulkPricing: [{
      minQty: Number,
      pricePerUnit: Number
    }]
  },

  recipeId: ObjectId,              // ref: recipes (same tenant DB)

  images: [String],
  tags: [String],
  isActive: Boolean,
  availableOnStorefront: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

### recipes
```javascript
{
  _id: ObjectId,
  name: String,                    // "Classic Smoked Brisket"
  description: String,
  category: String,

  ingredients: [{
    ingredientId: ObjectId,        // ref: ingredients (same tenant DB)
    name: String,
    quantity: Number,
    unit: String,                  // "lb" | "oz" | "tsp" | "each"
    notes: String
  }],

  instructions: [{
    step: Number,
    description: String,
    duration: Number,              // in minutes
    temperature: { value: Number, unit: String }
  }],

  yield: {
    quantity: Number,
    unit: String
  },

  costPerUnit: Number,             // auto-calculated from ingredients

  tags: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### ingredients
```javascript
{
  _id: ObjectId,
  name: String,
  sku: String,                     // unique within this tenant DB
  category: String,                // "meat" | "spice" | "casing" | "packaging" | "other"
  unit: String,                    // base unit of measure

  currentStock: Number,
  reorderPoint: Number,
  reorderQty: Number,

  cost: {
    perUnit: Number,
    lastUpdated: Date,
    supplier: ObjectId             // ref: suppliers (same tenant DB)
  },

  allergens: [String],
  shelfLife: { value: Number, unit: String },
  storageRequirements: String,     // "refrigerated" | "frozen" | "dry"

  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### inventory_transactions
```javascript
{
  _id: ObjectId,
  locationId: ObjectId,
  ingredientId: ObjectId,
  type: String,                    // "receiving" | "production_use" | "adjustment" | "waste" | "transfer"
  quantity: Number,                // positive for in, negative for out
  unit: String,
  reference: {
    type: String,                  // "purchase_order" | "production_batch" | "manual"
    id: ObjectId
  },
  notes: String,
  performedBy: ObjectId,           // ref: users (in platform DB)
  createdAt: Date
}
```

### suppliers
```javascript
{
  _id: ObjectId,
  name: String,
  contactName: String,
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  paymentTerms: String,            // "net30" | "net60" | "cod"
  notes: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### purchase_orders
```javascript
{
  _id: ObjectId,
  locationId: ObjectId,
  poNumber: String,                // auto-generated "PO-2024-0001", unique in tenant DB
  supplierId: ObjectId,

  items: [{
    ingredientId: ObjectId,
    name: String,
    quantity: Number,
    unit: String,
    unitCost: Number,
    totalCost: Number
  }],

  subtotal: Number,
  tax: Number,
  shipping: Number,
  total: Number,

  status: String,                  // "draft" | "submitted" | "confirmed" | "received" | "partial" | "canceled"

  expectedDelivery: Date,
  receivedDate: Date,
  notes: String,

  createdBy: ObjectId,
  approvedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### sales_orders
```javascript
{
  _id: ObjectId,
  locationId: ObjectId,
  orderNumber: String,             // "SO-2024-0001", unique in tenant DB

  customer: {
    type: String,                  // "b2b" | "b2c"
    name: String,
    email: String,
    phone: String,
    company: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    }
  },

  items: [{
    productId: ObjectId,
    name: String,
    configuration: Object,         // selected config options
    quantity: Number,
    unit: String,
    unitPrice: Number,
    totalPrice: Number
  }],

  subtotal: Number,
  tax: Number,
  shipping: Number,
  discount: { type: String, value: Number },
  total: Number,

  status: String,                  // "quote" | "pending" | "confirmed" | "processing" | "ready" | "shipped" | "delivered" | "canceled"
  paymentStatus: String,           // "unpaid" | "partial" | "paid" | "refunded"

  quoteValidUntil: Date,
  stripePaymentIntentId: String,

  notes: String,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### production_batches
```javascript
{
  _id: ObjectId,
  locationId: ObjectId,
  batchNumber: String,             // "BATCH-2024-0001", unique in tenant DB

  recipeId: ObjectId,
  productId: ObjectId,

  plannedQuantity: Number,
  actualQuantity: Number,
  unit: String,

  ingredientsUsed: [{
    ingredientId: ObjectId,
    planned: Number,
    actual: Number,
    unit: String
  }],

  status: String,                  // "planned" | "in_progress" | "completed" | "canceled"

  startedAt: Date,
  completedAt: Date,

  qualityNotes: String,
  temperature: { min: Number, max: Number, unit: String },

  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes Strategy

### Platform DB Indexes

```javascript
// Tenants
{ slug: 1 }                              // unique
{ owner: 1 }
{ "plan.status": 1 }

// Users
{ email: 1 }                              // unique
{ "memberships.tenantId": 1 }

// Plans
{ planId: 1 }                             // unique

// Feature Flags
{ key: 1 }                                // unique
```

### Tenant DB Indexes (applied per-tenant database)

```javascript
// Products
{ slug: 1 }                               // unique
{ sku: 1 }                                // unique
{ category: 1, isActive: 1 }
{ availableOnStorefront: 1 }
{ createdAt: -1 }

// Recipes
{ createdAt: -1 }
{ category: 1 }

// Ingredients
{ sku: 1 }                                // unique
{ currentStock: 1, reorderPoint: 1 }
{ category: 1 }
{ createdAt: -1 }

// Inventory Transactions
{ ingredientId: 1, createdAt: -1 }
{ locationId: 1, type: 1 }
{ createdAt: -1 }

// Suppliers
{ name: 1 }
{ createdAt: -1 }

// Purchase Orders
{ poNumber: 1 }                           // unique
{ status: 1, createdAt: -1 }
{ supplierId: 1 }
{ createdAt: -1 }

// Sales Orders
{ orderNumber: 1 }                        // unique
{ status: 1, createdAt: -1 }
{ "customer.email": 1 }
{ createdAt: -1 }

// Production Batches
{ batchNumber: 1 }                        // unique
{ status: 1, createdAt: -1 }
{ recipeId: 1 }
{ createdAt: -1 }
```

## Connection Usage

```typescript
import { connectPlatformDB, connectTenantDB, getTenantModels } from "@illuminate/db";

// Platform operations
await connectPlatformDB();
const tenant = await Tenant.findOne({ slug: "acme-meat-co" });

// Tenant operations — each tenant has its own DB
const tenantDB = await connectTenantDB("acme-meat-co");
const { Product, Recipe, Ingredient } = getTenantModels(tenantDB);
const products = await Product.find({ isActive: true });

// In API routes with withTenantAuth:
export const GET = withTenantAuth(async (req, ctx) => {
  const Product = ctx.db.model("Product");
  const products = await Product.find({ isActive: true });
  return NextResponse.json(products);
});
```
