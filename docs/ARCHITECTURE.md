# Illuminate V3 SaaS Platform — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ILLUMINATE V3 PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Marketing   │  │   Admin      │  │   Tenant Dashboard    │ │
│  │  & Signup    │  │   Portal     │  │   (Meat Locker App)   │ │
│  │              │  │              │  │                       │ │
│  │  - Landing   │  │  - Tenants   │  │  - Operations         │ │
│  │  - Pricing   │  │  - Billing   │  │  - Inventory          │ │
│  │  - Register  │  │  - Features  │  │  - Recipes/Products   │ │
│  │  - Checkout  │  │  - Analytics │  │  - Orders/Sales       │ │
│  │              │  │  - Support   │  │  - Storefront         │ │
│  │              │  │              │  │  - AI Features         │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
│         │                 │                       │             │
│  ───────┴─────────────────┴───────────────────────┴──────────── │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   SHARED CORE PACKAGES                      ││
│  │                                                             ││
│  │  @illuminate/db          - MongoDB models & connection      ││
│  │  @illuminate/auth        - NextAuth config & middleware     ││
│  │  @illuminate/billing     - Stripe integration & webhooks   ││
│  │  @illuminate/ui          - shadcn/ui component library     ││
│  │  @illuminate/config      - Shared TypeScript/ESLint config ││
│  │  @illuminate/email       - Transactional email templates   ││
│  │  @illuminate/ai          - AI integration (OpenAI/Claude)  ││
│  │  @illuminate/permissions - RBAC & feature flags            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ MongoDB  │  │  Stripe  │  │  Redis   │  │ Object Store  │  │
│  │  Atlas   │  │          │  │ (cache)  │  │ (S3/R2)       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Three Access Layers

```
Layer 1: SUPER ADMIN (Platform Owner — You)
├── Manage all tenants (create, suspend, delete)
├── Manage subscription plans & pricing
├── Feature flag management & rollouts
├── Platform analytics & revenue dashboards
├── Support ticket oversight
└── System health monitoring

Layer 2: TENANT ADMIN (Customer — Meat Business Owner)
├── Manage their organization profile
├── Manage locations (single or multi-site)
├── Manage users & roles within their org
├── View billing & subscription details
├── Configure their storefront
├── Access all operational features
└── Purchase AI add-on features

Layer 3: BUSINESS USER (Tenant's Staff)
├── Role-based access to features
├── Operations (inventory, recipes, production)
├── Sales (orders, quotes, POS)
├── Purchasing (suppliers, purchase orders)
└── Reports (scoped to their permissions)
```

### Tenant Isolation Strategy — Database-Per-Tenant

Each tenant gets its own MongoDB database. The platform maintains a separate
database for SaaS-level concerns. This provides **database-level isolation** —
a missed query filter can never leak data across tenants.

```
┌─────────────────────────────────┐
│  illuminate_platform (DB)       │   ← SaaS platform data
│  ├── tenants                    │
│  ├── users                      │
│  ├── plans                      │
│  └── feature_flags              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  tenant_acme_meat_co (DB)       │   ← Tenant "Acme Meat Co" data
│  ├── products                   │
│  ├── recipes                    │
│  ├── ingredients                │
│  ├── inventorytransactions      │
│  ├── suppliers                  │
│  ├── purchaseorders             │
│  ├── salesorders                │
│  └── productionbatches          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  tenant_bobs_bbq (DB)           │   ← Tenant "Bob's BBQ" data
│  ├── products                   │
│  ├── recipes                    │
│  └── ... (same collections)     │
└─────────────────────────────────┘
```

**How it works:**

- **Platform DB** (`illuminate_platform`): Stores tenants, users, plans, and feature flags.
  Connected via the default Mongoose instance (`connectPlatformDB()`).
- **Tenant DBs** (`tenant_<slug>`): Each tenant's business data lives in its own database.
  Auto-created when a tenant first signs up. Connected via `connectTenantDB(slug)`.
- **Connection pooling**: Tenant connections are cached per-process for the lifetime of the
  serverless function invocation. No per-request overhead after first connection.
- **Tenant-scoped models**: `Product`, `Recipe`, `Ingredient`, etc. have **no `tenantId` field**.
  They are registered on the tenant's own Connection via `registerTenantModels()`.
- **Middleware**: `withTenantAuth()` resolves the tenant from the JWT, opens the tenant DB
  connection, and passes it as `ctx.db` to the route handler.
- **Subdomain routing**: Tenant resolution via subdomain (`acme.meatlocker.app`) or custom domain.
- **Storage**: Tenant-prefixed object storage paths (`s3://bucket/tenant_<slug>/...`).

**Benefits:**

1. **Zero risk of cross-tenant data leaks** — data lives in separate databases
2. **Independent backup & restore** — can restore a single tenant's data without affecting others
3. **Per-tenant performance tuning** — can add indexes or scale specific tenant databases
4. **Compliance-friendly** — easy to demonstrate data isolation for audits
5. **Clean tenant offboarding** — drop the database to fully remove a tenant's data

## Commerce Layers

### Layer A: SaaS Commerce (You → Tenants)
```
Plan Selection → Registration → Stripe Checkout → Email Verify → Onboarding → Dashboard
```
- Subscription-based billing (monthly/annual)
- Tiered plans: Starter, Professional, Enterprise
- Add-on features: AI Product Configurator, AI Inventory/MRP
- Usage-based billing for AI features (token metering)

### Layer B: Business Commerce (Tenant → Their Customers)
```
Storefront → Product Config → Cart → Checkout → Order Tracking
```
- Tenant's customers browse and configure meat products
- AI-powered product configuration (add-on)
- Quote requests for large/custom orders
- Order management and fulfillment tracking

## Monorepo Structure

```
illuminate_v3_saas/
├── apps/
│   ├── web/                    # Marketing site + signup flow
│   ├── admin/                  # Super admin portal
│   ├── dashboard/              # Tenant dashboard (main app)
│   └── storefront/             # B2C customer-facing storefront
│
├── packages/
│   ├── db/                     # MongoDB schemas, connection, queries
│   ├── auth/                   # NextAuth.js config, providers, middleware
│   ├── billing/                # Stripe subscriptions, webhooks, metering
│   ├── ui/                     # Shared UI components (shadcn/ui based)
│   ├── email/                  # Email templates (React Email)
│   ├── ai/                     # AI integrations (product config, MRP)
│   ├── permissions/            # RBAC system, feature flags
│   ├── config-typescript/      # Shared tsconfig
│   └── config-eslint/          # Shared eslint config
│
├── docs/                       # Architecture & API docs
├── turbo.json                  # Turborepo pipeline config
├── package.json                # Root workspace config
└── .env.example                # Environment variables template
```

## URL Routing & Tenant Resolution

### URL Structure

```
┌──────────────────────────────────────────────────────────────┐
│  MARKETING SITE                                               │
│  meatlocker.app                → apps/web                     │
│  meatlocker.app/pricing        → apps/web                     │
│  meatlocker.app/auth/login     → apps/web                     │
├──────────────────────────────────────────────────────────────┤
│  ADMIN PORTAL (super admins only)                             │
│  admin.meatlocker.app          → apps/admin                   │
├──────────────────────────────────────────────────────────────┤
│  TENANT DASHBOARD (authenticated tenant users)                │
│  acme.meatlocker.app/dashboard → apps/dashboard               │
│  bobs-bbq.meatlocker.app      → apps/dashboard               │
├──────────────────────────────────────────────────────────────┤
│  STOREFRONT (public, tenant's customers)                      │
│  acme.meatlocker.app/store     → apps/storefront              │
│  shop.acmemeat.com             → apps/storefront (custom)     │
└──────────────────────────────────────────────────────────────┘
```

### Tenant Resolution Flow

```
Incoming Request
  │
  ├─ Check subdomain: acme.meatlocker.app
  │   └─ Extract "acme" → validate format → x-tenant-slug header
  │
  ├─ Check custom domain: shop.acmemeat.com
  │   └─ Pass domain → app does DB lookup → resolve tenant
  │
  └─ No tenant found
      ├─ Dev: pass through (pages handle their own context)
      └─ Prod: return 404 (don't reveal tenant existence)
```

### Reserved Subdomains

The following subdomains are reserved and never resolve to tenants:
`www`, `api`, `admin`, `app`, `auth`, `billing`, `docs`, `help`, `mail`,
`status`, `support`

## Authentication & Security Model

### How Auth Works

```
┌──────────────────────────────────────────────────────────────┐
│  LOGIN FLOW                                                   │
│                                                               │
│  1. User submits email + password (or clicks Google OAuth)    │
│  2. NextAuth verifies credentials against platform DB         │
│  3. JWT token created with:                                   │
│     { userId, platformRole, tenantId, tenantSlug,             │
│       role, permissions }                                     │
│  4. Token is HttpOnly, Secure, SameSite cookie                │
│  5. Session data derived from JWT (no DB hit per request)     │
│  6. Tenant DB connection opened from tenantSlug in JWT        │
└──────────────────────────────────────────────────────────────┘
```

### Per-App Middleware Protection

| App | Middleware | What It Checks |
|-----|-----------|----------------|
| **web** | None (public) | No auth needed for marketing/pricing pages |
| **admin** | `auth()` → JWT | 1. Authenticated? 2. `platformRole === "super_admin"` from JWT claims |
| **dashboard** | `auth()` → JWT | 1. Authenticated? 2. Has tenant context? 3. Subdomain matches session tenant? |
| **storefront** | Tenant resolver | 1. Subdomain → extract slug. 2. Custom domain → pass for DB lookup. No auth for browsing. |

### Security Protections

```
┌──────────────────────────────────────────────────────────────┐
│  THREAT                    │  PROTECTION                      │
├────────────────────────────┼──────────────────────────────────┤
│  Session tampering         │  JWT signed with NEXTAUTH_SECRET │
│  Role spoofing             │  Roles read from JWT claims,     │
│                            │  NOT cookies/headers              │
│  Cross-tenant access       │  Database-per-tenant isolation    │
│                            │  + subdomain ↔ session matching   │
│  Tenant enumeration        │  Generic 403/404 on mismatches   │
│                            │  (no "tenant not found" errors)   │
│  Admin portal discovery    │  Generic "Access Denied" page    │
│                            │  (no mention of "admin portal")   │
│  XSS token theft           │  HttpOnly + Secure + SameSite    │
│                            │  cookies (NextAuth default)       │
│  CSRF                      │  NextAuth built-in CSRF tokens    │
│  Data leaks via API        │  withTenantAuth() enforces        │
│                            │  tenant DB scoping on every route │
└──────────────────────────────────────────────────────────────┘
```

### JWT Token Contents

The JWT is the single source of truth for authentication state. It is:
- **Signed** with `NEXTAUTH_SECRET` (tamper-proof)
- **HttpOnly** cookie (not accessible to JavaScript)
- **30-day expiry** with refresh

```typescript
// JWT payload (set during sign-in, verified on every request)
{
  userId: "6507a...",              // MongoDB ObjectId
  platformRole: "user",           // "super_admin" | "platform_admin" | "user"
  tenantId: "6507b...",           // Active tenant's ObjectId
  tenantSlug: "acme-meat-co",     // Active tenant's slug (used for DB + URLs)
  role: "owner",                  // Tenant role: "owner" | "admin" | "member" | "viewer"
  permissions: ["inventory:write"] // Granular permission overrides
}
```

### Tenant Switching

Users who belong to multiple tenants can switch via session update:

```typescript
// Client-side tenant switch
await updateSession({ tenantId: "newTenantId" });
// → JWT callback re-validates membership
// → Updates tenantId, tenantSlug, role, permissions
// → Subsequent requests use new tenant's database
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | NextAuth.js v5 |
| Billing | Stripe (Subscriptions + Checkout) |
| Styling | Tailwind CSS + shadcn/ui |
| Monorepo | Turborepo |
| Email | React Email + Resend |
| AI | Anthropic Claude API |
| Cache | Redis (Upstash) |
| Storage | S3-compatible (AWS S3 / Cloudflare R2) |
| Deployment | Vercel (per-app) |
