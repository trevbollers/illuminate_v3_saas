# Go Participate — Platform Architecture

## Tenant Hierarchy

Go Participate has a **nested tenant model** — not flat multi-tenancy like Illuminate. There are distinct tenant types with cross-tenant relationships.

```
PLATFORM (Go Participate)
│
├── LEAGUE TENANTS ──────────────────────────────────────────
│   │  e.g., MidAmerica 7v7 Football
│   │  Subdomain: midamerica7v7.goparticipate.com
│   │
│   │  Owns & manages:
│   ├── Events (tournaments, showcases, league seasons)
│   ├── Age/eligibility rules per division
│   ├── Registration windows & pricing
│   ├── Approved organizations list
│   ├── Brackets, schedules, standings
│   ├── Compliance rules (coach certs, waivers)
│   │
│   │  Has relationships with:
│   ├── → ORG TENANTS that register teams for events
│   ├── → MEDIA (Your Prep Sports) for coverage
│   └── → UNIFORM PARTNER for merchandise
│
├── ORGANIZATION TENANTS ────────────────────────────────────
│   │  e.g., KC Thunder 7v7
│   │  Subdomain: kcthunder.goparticipate.com
│   │
│   │  Owns & manages:
│   ├── Multiple teams (U10, U12, U14, etc.)
│   ├── Coaches & staff across teams
│   ├── Organization-level financials
│   ├── Tryout management
│   │
│   │  Has relationships with:
│   ├── → LEAGUE TENANTS they register with
│   ├── → TEAMS (sub-units, not separate tenants)
│   └── → FAMILIES/PLAYERS on their rosters
│
├── TEAMS (sub-unit of Organization) ────────────────────────
│   │  e.g., KC Thunder U14
│   │  NOT a separate tenant — scoped within org
│   │
│   ├── Roster (players + parent links)
│   ├── Schedule (practices + league events)
│   ├── Attendance & availability
│   ├── Communication threads
│   ├── Stats & game data
│   └── Uniform orders
│
└── FAMILIES / PLAYERS (user accounts, not tenants) ─────────
    │
    ├── Player profiles (can span multiple teams/orgs)
    ├── Age verification documents (verify once)
    ├── Medical/emergency info
    ├── Payment history across all teams
    └── Uniform orders
```

---

## Access Layers (forked from Illuminate 3-tier model)

### Layer 1: Platform Admin (Go Participate Operator)
- **App**: `apps/admin` at `admin.goparticipate.com`
- **Who**: Go Participate staff
- **Can do**: Manage all tenants (leagues + orgs), plans & pricing, feature flags, partner management, revenue analytics, support
- **Auth**: `platformRole === "gp_admin"`

### Layer 2: League Admin
- **App**: `apps/league` at `<league-slug>.goparticipate.com`
- **Who**: MidAmerica 7v7 staff, league directors
- **Can do**: Create/manage events, set division rules, verify player ages, manage registrations, view cross-org rosters, generate brackets, publish results
- **Auth**: `tenantType === "league"` + `role: "owner" | "admin"`

### Layer 3: Organization / Team Admin
- **App**: `apps/dashboard` at `<org-slug>.goparticipate.com`
- **Who**: Club directors, head coaches, team managers
- **Can do**: Manage rosters, schedule practices, register for league events, collect payments, communicate with parents, track stats, order uniforms
- **Auth**: `tenantType === "organization"` + `role: "owner" | "admin" | "coach" | "manager"`

### Layer 4: Family / Parent Portal
- **App**: `apps/family` (mobile-first, possibly React Native)
- **Who**: Parents, guardians, players (age-appropriate)
- **Can do**: View schedules across all kids/teams, RSVP, pay dues, upload documents, receive notifications, order uniforms, accept team invites
- **Auth**: Authenticated user with `familyId` — no tenant role required

### Layer 5: Public / Media
- **App**: `apps/web` at `goparticipate.com` (marketing + event discovery)
- **App**: Your Prep Sports site (event coverage, rankings)
- **Who**: General public, prospective users
- **Can do**: Browse events, view public standings/brackets, read coverage
- **Auth**: None required

---

## App Structure (forked from Illuminate)

```
go_participate/
├── apps/
│   ├── web/           # Marketing site + event discovery (port 4000)
│   │                  # goparticipate.com
│   ├── admin/         # Platform admin portal (port 4001)
│   │                  # admin.goparticipate.com
│   ├── league/        # League management dashboard (port 4002)
│   │                  # <league>.goparticipate.com
│   ├── dashboard/     # Org/team management dashboard (port 4003)
│   │                  # <org>.goparticipate.com
│   ├── family/        # Parent/player portal — mobile-first (port 4004)
│   │                  # family.goparticipate.com or native app
│   └── media/         # Your Prep Sports (port 4005)
│                      # yourprepsports.com
│
├── packages/
│   ├── auth/          # NextAuth.js config, JWT, tenant resolution
│   ├── db/            # MongoDB models, connections, tenant DB resolution
│   ├── billing/       # Stripe subscriptions + event registration fees
│   ├── permissions/   # RBAC roles, sport-specific permissions
│   ├── ui/            # Shared shadcn/ui components
│   ├── email/         # React Email templates (Resend)
│   ├── ai/            # AI coach assistant, player reports
│   ├── sports/        # Sport-specific logic (7v7 rules, basketball rules)
│   ├── verification/  # Age verification, document processing
│   ├── notifications/ # Push notifications, SMS, email delivery
│   ├── config-typescript/
│   └── config-eslint/
│
├── docs/
│   ├── go-participate/    # All design & architecture docs
│   └── ...
│
├── scripts/
├── turbo.json
├── docker-compose.yml
└── .env.example
```

---

## Database Architecture

**Strategy**: Database-per-tenant isolation (same as Illuminate)

### Platform DB (`goparticipate_platform`)

| Collection | Purpose |
|------------|---------|
| `users` | All user accounts (coaches, parents, admins) |
| `tenants` | League and organization tenant records |
| `plans` | Subscription tiers and pricing |
| `feature_flags` | Per-tier feature toggles |
| `partners` | Uniform partner config and rev share terms |
| `players` | Global player profiles (linked to families) |
| `families` | Family groupings (parent → children links) |
| `verifications` | Age verification records and document refs |
| `sports` | Sport definitions and rule configurations |

### League Tenant DB (`league_<slug>`)

| Collection | Purpose |
|------------|---------|
| `events` | Tournaments, seasons, showcases, combines |
| `divisions` | Age/grade divisions with eligibility rules |
| `registrations` | Team registrations for events |
| `brackets` | Tournament bracket structures |
| `games` | Individual game records within events |
| `standings` | League/tournament standings |
| `compliance_rules` | Coach cert requirements, waiver templates |
| `waivers` | Signed waiver records |

### Organization Tenant DB (`org_<slug>`)

| Collection | Purpose |
|------------|---------|
| `teams` | Team definitions (U10, U12, etc.) |
| `rosters` | Player-to-team assignments per season |
| `events` | Org-level events (practices, scrimmages) |
| `attendance` | Check-in records per event |
| `messages` | Team and org communication |
| `transactions` | Payment records (dues, fees) |
| `stats` | Game statistics (sport-specific schema) |
| `uniform_orders` | Uniform order records |
| `invites` | Pending team invitations |

---

## Architecture Fork Map (from Illuminate)

```
illuminate_v3_saas (base)          →    go_participate (fork)
─────────────────────────               ─────────────────────

apps/web (marketing)               →    apps/web (marketing + event discovery)
apps/admin (saas admin)            →    apps/admin (platform admin)
apps/dashboard (tenant ops)        →    apps/league (league management)
                                   →    apps/dashboard (org/team management)
apps/storefront (B2C)              →    apps/family (parent/player portal)
                                   →    apps/media (Your Prep Sports)

packages/auth                      →    packages/auth (same patterns, new roles)
packages/db                        →    packages/db (new collections)
packages/billing                   →    packages/billing (same Stripe patterns)
packages/permissions               →    packages/permissions (new sport perms)
packages/ui                        →    packages/ui (shared components)
packages/email                     →    packages/email (new templates)
packages/ai                        →    packages/ai (coach assistant, reports)
                                   →    packages/sports (NEW — sport rules)
                                   →    packages/verification (NEW — age verify)
                                   →    packages/notifications (NEW — push/SMS)
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenancy | Database-per-tenant | Same as Illuminate — zero cross-tenant data leak risk |
| Tenant hierarchy | League → Org → Team | Leagues need cross-org visibility; teams are sub-units not tenants |
| Player profiles | Platform DB (global) | Players must be portable across leagues/orgs — "verify once" |
| Family grouping | Platform DB (global) | Parent sees all kids across all teams in one view |
| Mobile strategy | TBD: React Native vs PWA | Family portal is mobile-primary; coach game-day features need offline |
| Real-time | TBD: WebSocket vs SSE | Live scoring, chat, notifications need real-time |
| Auth | NextAuth.js v5 (same as Illuminate) | JWT with tenantType, tenantId, role, permissions |
