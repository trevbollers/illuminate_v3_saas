# Go Participate — Youth Sports Platform — Project Context

## What This Is

A mobile-first, AI-centric multi-tenant SaaS platform for youth sports team management (7v7 football
and basketball at launch). Built as a Turborepo monorepo with Next.js 14 (App Router), TypeScript,
MongoDB Atlas (database-per-tenant isolation), NextAuth.js v5, Stripe billing, and Anthropic Claude
AI features.

The platform domain is `goparticipate.com`. League tenants get subdomains
(`midamerica7v7.goparticipate.com`), org tenants get subdomains (`kcthunder.goparticipate.com`),
or can connect custom domains.

**Brand Properties**:
- **Go Participate** (goparticipate.com) — Core platform
- **Your Prep Sports** (yourprepsports.com) — Media arm (future)
- **MidAmerica 7v7** (midamerica7v7.org) — Launch league tenant

## Architecture Overview

```
go-participate/
├── apps/
│   ├── web/           # Marketing site + signup (port 4000) — goparticipate.com
│   ├── admin/         # Platform admin portal (port 4001) — admin.goparticipate.com
│   ├── league/        # League management (port 4002) — <league>.goparticipate.com
│   ├── dashboard/     # Org/team management (port 4003) — <org>.goparticipate.com
│   └── storefront/    # Org public page (port 4004) — <org>.goparticipate.com/store
│
├── packages/
│   ├── auth/          # NextAuth.js config, middleware, JWT types
│   ├── db/            # MongoDB models, connection pooling, tenant DB resolution
│   ├── billing/       # Stripe subscriptions, event fees, dues collection
│   ├── permissions/   # RBAC roles, sport-specific permissions, feature flags
│   ├── ui/            # Shared shadcn/ui components
│   ├── email/         # React Email templates (Resend)
│   ├── config-typescript/
│   └── config-eslint/
│
├── docs/
│   ├── go-participate/   # Platform design docs (vision, architecture, features, etc.)
│   ├── ARCHITECTURE.md   # System design (legacy Illuminate reference)
│   ├── DATABASE_SCHEMA.md
│   └── USER_FLOWS.md
│
├── scripts/           # Utility/seed scripts
├── turbo.json         # Turborepo pipeline
├── docker-compose.yml # Local MongoDB
└── .env.example       # All environment variables
```

## Three-Layer SaaS Model

Go Participate is NOT a standard flat SaaS. Families are platform citizens, not tenant property.

```
LAYER 1: PLATFORM (Go Participate)        — Identity provider, document custodian
├── LAYER 2a: LEAGUE TENANTS              → DB: league_<slug>
│   └── Events, divisions, brackets, compliance, verification reviews
├── LAYER 2b: ORG/TEAM TENANTS            → DB: org_<slug>
│   └── Teams, rosters, scheduling, payments, communication
└── LAYER 3: FAMILIES / PLAYERS           → goparticipate_platform DB
    └── Player profiles, encrypted document vault, family groupings
    └── NOT owned by any tenant — float between orgs and leagues freely
```

Orgs and standalone teams are both `tenantType: "organization"`. The difference is plan tier
and team count. Both use `apps/dashboard` — the UI adapts based on role and plan limits.

Layer 2 tenants transact with each other (orgs register for league events). The platform
brokers these cross-tenant interactions.

## Where New Feature Data Goes

```
About a PERSON (player/family)?          → Platform DB
About a LEAGUE's operations?             → League DB
About an ORG's operations?               → Org DB
Crosses tenant boundaries?               → Platform brokers it (stores reference/grant/consent)
Platform-wide configuration?             → Platform DB (sports, plans, feature_flags)
```

## Five Access Layers

### Layer 1: Platform Admin (Go Participate Staff)
- **App**: `apps/admin` at `admin.goparticipate.com`
- **Auth**: `platformRole === "gp_admin"`
- **Can do**: Manage all tenants, plans, feature flags, revenue analytics

### Layer 2: League Admin
- **App**: `apps/league` at `<league>.goparticipate.com`
- **Auth**: `tenantType === "league"` + `role: "league_owner" | "league_admin"`
- **Can do**: Events, divisions, age verification, brackets, compliance

### Layer 3: Organization / Team Admin
- **App**: `apps/dashboard` at `<org>.goparticipate.com`
- **Auth**: `tenantType === "organization"` + `role: "org_owner" | "org_admin" | "head_coach"`
- **Can do**: Rosters, scheduling, payments, communication, stats, uniforms

### Layer 4: Family / Parent Portal
- **App**: `apps/dashboard` (different view based on role)
- **Auth**: Authenticated user with family links
- **Can do**: View schedules, RSVP, pay dues, upload documents, view stats

### Layer 5: Public
- **App**: `apps/web` (marketing), `apps/storefront` (org public page)
- **Auth**: None required

## Platform Roles
```
PlatformRole = "gp_admin" | "gp_support" | "user"
```

## League Tenant Roles
```
league_owner  (100) — Full league control, billing, settings
league_admin  (80)  — Event management, verification, compliance
league_staff  (60)  — Score entry, check-in, day-of operations
league_viewer (20)  — View-only access to league data
```

## Organization Tenant Roles
```
org_owner        (100) — Full org control, billing, all teams
org_admin        (80)  — Manage all teams, staff, financials
head_coach       (60)  — Full team management, roster, registration
assistant_coach  (40)  — Attendance, communication, lineup
team_manager     (40)  — Admin tasks — payments, communication, sizing
viewer           (20)  — View-only
```

## Multi-Tenant Database Architecture

**Strategy**: Database-per-tenant isolation (zero cross-tenant data leak risk).

- **Platform DB** (`goparticipate_platform`): `tenants`, `users`, `plans`, `feature_flags`,
  `players`, `families`, `document_vault` (encrypted), `document_grants`, `sports`
- **League DBs** (`league_<slug>`): `events`, `divisions`, `registrations`, `roster_snapshots`,
  `brackets`, `games`, `standings`, `compliance_rules`, `waivers`, `verification_reviews`
- **Org DBs** (`org_<slug>`): `teams`, `rosters`, `org_events`, `attendance`, `messages`,
  `transactions`, `stats`, `uniform_orders`, `invites`, `verification_services`

### Data Ownership Principles

- **Families own their data.** Player profiles and documents live in the platform DB, not in
  any tenant DB. Families move between orgs and leagues freely.
- **Tenants own their operations.** League event data stays in the league DB. Org team
  management stays in the org DB. No tenant can access another tenant's operational data.
- **The platform brokers cross-tenant interactions.** When an org registers for a league event,
  the platform provides player identity; the league stores the registration; the org submitted it.
- **Verifications are league-scoped.** Each league defines its own compliance requirements and
  reviews documents independently. A verification approved by League A does not apply to League B.

### Family Data Protection (CRITICAL)

**The platform is a zero-knowledge document vault.** Family-uploaded documents (birth certificates,
medical forms, etc.) are encrypted client-side before upload. The platform stores encrypted blobs
and cannot read them. Access is granted per-document, per-tenant, with time-limited keys that
families can revoke at any time.

**When writing code that touches family/player data, you MUST:**
- NEVER store plaintext PII (names, DOB, addresses, medical info) outside of the encrypted vault
  or the `players`/`families` collections in the platform DB
- NEVER copy family documents or document content into tenant databases
- NEVER log, cache, or persist decrypted document content to disk
- NEVER expose document URLs without verifying an active, non-expired, non-revoked grant exists
- ALWAYS use `packages/vault` (when implemented) for encryption/decryption operations
- ALWAYS verify grant authorization before streaming decrypted content
- ALWAYS use integrity hashes (SHA-256) for verification matching, not plaintext comparison
- League DBs store only verification DECISIONS (approved/rejected), never the documents themselves
- Org DBs may store verification service fees (transactions), never the documents themselves

See `docs/go-participate/07-DATA-OWNERSHIP.md` for the full encryption architecture.

## Pricing Tiers

| Tier | Price | Target |
|------|-------|--------|
| Free | $0/mo | 1 team, 15 players — basic scheduling, RSVP, chat |
| Team Pro | $9.99/mo | 1 team, 25 players — stats, dev tracking, calendar sync |
| Partner | $4.99/mo | Team Pro features — unlocked via uniform partner commitment |
| Organization | $29.99/mo | Up to 10 teams — multi-team dashboard, registration, financials |
| League | $79.99/mo | Unlimited teams — events, verification, brackets, YPS integration |
| AI Coach | $4.99/mo add-on | Practice plans, lineups, recaps |
| AI Scout | $4.99/mo add-on | Player eval, development reports |

## Key Commands

```bash
# Dev (all apps)
npm run dev

# Dev (specific app)
npm run dev:league
npm run dev:dashboard

# Build
npm run build

# Local services (MongoDB)
docker compose up -d
```

## Key Files Reference

| Concern | Path |
|---------|------|
| Roles & hierarchy | `packages/permissions/src/roles.ts` |
| Permissions | `packages/permissions/src/permissions.ts` |
| Permission checker | `packages/permissions/src/check.ts` |
| Auth config & JWT | `packages/auth/src/config.ts` |
| Auth types (Session/JWT) | `packages/auth/src/types.ts` |
| Tenant resolver | `packages/auth/src/tenant-resolver.ts` |
| User model | `packages/db/src/models/user.ts` |
| Tenant model | `packages/db/src/models/tenant.ts` |
| DB connections | `packages/db/src/connection.ts` |
| Stripe billing | `packages/billing/src/` |
| Design docs | `docs/go-participate/` |

## Conventions

- Package imports use `@goparticipate/<package>` (e.g., `@goparticipate/db`, `@goparticipate/auth`)
- League DB naming: `league_<slug>` (hyphens → underscores)
- Org DB naming: `org_<slug>` (hyphens → underscores)
- Reserved subdomains: `www`, `api`, `admin`, `app`, `auth`, `billing`, `docs`, `help`, `mail`, `status`, `support`
- API routes use `withTenantAuth()` middleware for automatic tenant DB scoping
- All monetary values stored in cents (integers)
- Sports at launch: 7v7 Football, Basketball
