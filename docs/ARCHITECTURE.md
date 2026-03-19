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

### Tenant Isolation Strategy

- **Database**: Single MongoDB database, tenant-scoped documents (`tenantId` on every collection)
- **Middleware**: Tenant resolution via subdomain (`acme.meatlocker.app`) or custom domain
- **API**: All API routes enforce tenant context via middleware
- **Storage**: Tenant-prefixed object storage paths

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
