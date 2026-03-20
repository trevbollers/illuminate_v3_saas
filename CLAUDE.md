# Illuminate V3 SaaS Platform — Project Context

## What This Is

A multi-tenant SaaS platform for meat processing businesses ("Meat Locker"). Built as a
Turborepo monorepo with Next.js 14 (App Router), TypeScript, MongoDB Atlas (database-per-tenant
isolation), NextAuth.js v5, Stripe billing, and Anthropic Claude AI features.

The platform domain is `meatlocker.app`. Each tenant gets a subdomain (`acme.meatlocker.app`)
or can connect a custom domain.

## Architecture Overview

```
illuminate_v3_saas/
├── apps/
│   ├── web/           # Marketing site + signup (port 3000) — meatlocker.app
│   ├── admin/         # Super admin portal (port 3001) — admin.meatlocker.app
│   ├── dashboard/     # Tenant dashboard (port 3002) — <slug>.meatlocker.app
│   └── storefront/    # B2C storefront (port 3003) — <slug>.meatlocker.app/store
│
├── packages/
│   ├── auth/          # NextAuth.js config, middleware, JWT types
│   ├── db/            # MongoDB models, connection pooling, tenant DB resolution
│   ├── billing/       # Stripe subscriptions, webhooks, usage metering
│   ├── permissions/   # RBAC roles, 31 granular permissions, feature flags
│   ├── ui/            # Shared shadcn/ui components
│   ├── email/         # React Email templates (Resend)
│   ├── ai/            # AI integrations (product configurator, MRP)
│   ├── config-typescript/
│   └── config-eslint/
│
├── docs/
│   ├── ARCHITECTURE.md    # Full system design
│   ├── DATABASE_SCHEMA.md # MongoDB collections & indexes
│   └── USER_FLOWS.md      # User journeys & auth flows
│
├── scripts/           # Utility/seed scripts
├── turbo.json         # Turborepo pipeline
├── docker-compose.yml # Local MongoDB + Redis
└── .env.example       # All environment variables
```

## Three Access Layers

### Layer 1: SaaS Admin (Platform Owner)
- **App**: `apps/admin` at `admin.meatlocker.app`
- **Access**: Users with `platformRole === "saas_admin"` in the platform DB
- **Can do**: Manage all tenants, plans & pricing, feature flags, revenue analytics, support
- **Auth type**: `PlatformRole` from `packages/auth/src/types.ts`

### Layer 2: Tenant Admin (Meat Business Owner)
- **App**: `apps/dashboard` at `<slug>.meatlocker.app`
- **Access**: Users with `role: "owner"` or `role: "admin"` in their tenant membership
- **Can do**: Manage org, locations, team, billing, storefront config, all operations
- **Auth type**: `TenantRole` from `packages/auth/src/types.ts`

### Layer 3: Business User (Tenant Staff)
- **App**: `apps/dashboard` (same app, scoped by permissions)
- **Access**: Users with `role: "manager" | "staff" | "viewer"` in their tenant membership
- **Can do**: Role-gated access to inventory, recipes, production, sales, purchasing, reports

## User & Role System

### Platform Roles (`packages/auth/src/types.ts`)
```
PlatformRole = "saas_admin" | "platform_admin" | "user"
```
- `saas_admin` — Full platform control (super admin portal)
- `platform_admin` — Reserved for future use
- `user` — Regular user (default, no platform privileges)

### Tenant Roles (`packages/permissions/src/roles.ts`)
```
owner   (level 100) — Complete access, all 31 permissions
admin   (level  80) — All except settings.manage, team.manage (29 permissions)
manager (level  60) — Operations + team.invite, no deletes/refunds (25 permissions)
staff   (level  40) — View + create, no management actions (18 permissions)
viewer  (level  20) — View-only across all features (10 permissions)
```

### 31 Granular Permissions (`packages/permissions/src/permissions.ts`)
```
Products:    products.view, products.create, products.edit, products.delete
Recipes:     recipes.view, recipes.create, recipes.edit, recipes.delete
Inventory:   inventory.view, inventory.adjust, inventory.manage
Purchasing:  purchasing.view, purchasing.create, purchasing.approve
Sales:       sales.view, sales.create, sales.manage, sales.refund
Production:  production.view, production.create, production.manage
Team:        team.view, team.invite, team.manage
Settings:    settings.view, settings.billing, settings.manage
Storefront:  storefront.view, storefront.manage
Reports:     reports.view, reports.export
```

Owners always bypass permission checks (hardcoded `true` in `hasPermission()`).
Other roles can have custom permission overrides stored in `memberships[].permissions`.

### User Model (`packages/db/src/models/user.ts`)
```
User {
  email, name, passwordHash, image, phone
  platformRole: "saas_admin" | null
  memberships: [{
    tenantId, role, locationAccess[], permissions[], isActive, joinedAt
  }]
  activeTenantId  ← current tenant context
}
```

Users can belong to multiple tenants. Tenant switching updates the JWT via
`updateSession({ tenantId })`.

## Multi-Tenant Database Architecture

**Strategy**: Database-per-tenant isolation (zero cross-tenant data leak risk).

- **Platform DB** (`illuminate_platform`): `tenants`, `users`, `plans`, `feature_flags`
  - Connected via `connectPlatformDB()` (default mongoose instance)
- **Tenant DBs** (`tenant_<slug>`): `products`, `recipes`, `ingredients`, `inventorytxns`,
  `suppliers`, `purchaseorders`, `salesorders`, `productionbatches`
  - Connected via `connectTenantDB(slug)` (cached per-process)
  - No `tenantId` field in tenant collections — isolation is at the DB level
  - Models registered via `registerTenantModels()` on the tenant Connection

## Authentication (`packages/auth/`)

- NextAuth.js v5 with credentials + Google OAuth providers
- JWT-based sessions (HttpOnly, Secure, SameSite cookies, 30-day expiry)
- JWT contains: `userId, platformRole, tenantId, tenantSlug, role, permissions`
- Middleware per app:
  - `web`: public (no auth)
  - `admin`: requires `platformRole === "saas_admin"`
  - `dashboard`: requires authenticated + valid tenant context + subdomain match
  - `storefront`: tenant resolution only (public browsing, no auth)

## Billing (`packages/billing/`)

Two commerce layers:
1. **SaaS billing** (platform → tenant): Stripe subscriptions, tiered plans
   (Starter/Professional/Enterprise), 14-day trial, add-on AI features
2. **B2C commerce** (tenant → customer): Storefront checkout via tenant's Stripe

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | NextAuth.js v5 |
| Billing | Stripe (Subscriptions + Checkout) |
| Styling | Tailwind CSS + shadcn/ui |
| Monorepo | Turborepo |
| Email | React Email + Resend |
| AI | Anthropic Claude API |
| Cache | Redis (Upstash) |
| Storage | S3/Cloudflare R2 |
| Deployment | Vercel (per-app) |

## Key Commands

```bash
# Dev (all apps)
npm run dev

# Dev (specific app)
npm run dev --filter=@illuminate/dashboard

# Build
npm run build

# Lint
npm run lint

# Local services (MongoDB + Redis)
docker compose up -d
```

## Key Files Reference

| Concern | Path |
|---------|------|
| Roles & hierarchy | `packages/permissions/src/roles.ts` |
| All 31 permissions | `packages/permissions/src/permissions.ts` |
| Permission checker | `packages/permissions/src/check.ts` |
| Auth config & JWT | `packages/auth/src/config.ts` |
| Auth types (Session/JWT) | `packages/auth/src/types.ts` |
| Tenant resolver | `packages/auth/src/tenant-resolver.ts` |
| User model | `packages/db/src/models/user.ts` |
| Tenant model | `packages/db/src/models/tenant.ts` |
| DB connections | `packages/db/src/connection.ts` |
| Stripe billing | `packages/billing/src/` |
| Architecture docs | `docs/ARCHITECTURE.md` |
| DB schema docs | `docs/DATABASE_SCHEMA.md` |
| User flow docs | `docs/USER_FLOWS.md` |

## Conventions

- Package imports use `@illuminate/<package>` (e.g., `@illuminate/db`, `@illuminate/auth`)
- Tenant DB naming: `tenant_<slug>` (hyphens → underscores)
- Reserved subdomains: `www`, `api`, `admin`, `app`, `auth`, `billing`, `docs`, `help`, `mail`, `status`, `support`
- API routes in dashboard use `withTenantAuth()` middleware for automatic tenant DB scoping
- All monetary values stored in cents (integers)
