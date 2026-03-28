# 09 — Implementation Status

> Last updated: 2026-03-27

## Apps

### Dashboard (`apps/dashboard` — port 4003)

Org/team management for coaches, org admins, and parents.

**Pages (18):**

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Dashboard home | Built |
| `/login` | Auth login | Built |
| `/teams` | Team list | Built |
| `/teams/new` | Create team | Built |
| `/teams/[teamId]` | Team detail | Built |
| `/roster` | Roster list | Built |
| `/roster/new` | Add player to roster | Built |
| `/roster/import` | CSV drag-and-drop import | Built |
| `/schedule` | Calendar month + day list views | Built |
| `/schedule/new` | Create event (7 types, recurrence) | Built |
| `/schedule/[eventId]` | Event detail with inline edit + score entry | Built |
| `/attendance` | Event attendance with roster checklist | Built |
| `/communication` | Message inbox with channel tabs + pagination | Built |
| `/communication/new` | Compose message with ack options | Built |
| `/communication/[messageId]` | Message detail + ack tracker | Built |
| `/invite/[token]` | Invite acceptance landing page | Built |
| `/events` | Browse league events | Built |
| `/registration-cart` | Multi-item registration cart | Built |
| `/settings/payments` | Stripe connect + payment config | Built |

**API Routes (38+):**
- Auth: magic-code send, player-code, NextAuth
- Teams: CRUD, invites, roster management with jersey conflict detection
- Schedule: date-range query, create with recurrence, detail/edit/cancel
- Attendance: GET by event, POST initialize from roster, PATCH bulk status update
- Messages: inbox list, send with recipient resolution, detail with ack, ack POST, unread counts
- Announcements: list from affiliated leagues, detail with read tracking
- Players: search, create with family linking
- Registration cart: items CRUD, checkout with Stripe
- Billing: subscription, portal
- Settings: payment configuration

### League (`apps/league` — port 4002)

League administration for tournament/event management.

**Pages (13):**

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | League dashboard | Built |
| `/login` | Auth login | Built |
| `/events` | Event list with filters | Built |
| `/events/new` | Create event | Built |
| `/events/[id]` | Event detail (tabbed) | Built |
| `/events/[id]/checkin` | QR code scanner + manual check-in | Built |
| `/events/[id]/qrcodes` | QR code generation for roster | Built |
| `/divisions` | Division management | Built |
| `/brackets` | Bracket management | Built |
| `/registrations` | Registration management | Built |
| `/verification` | Age/doc verification reviews | Built |
| `/announcements` | Announcement list + delete | Built |
| `/announcements/new` | Compose announcement (target: all/event/division) | Built |
| `/settings/payments` | League Stripe configuration | Built |

**API Routes (27+):**
- Events: CRUD, divisions, brackets, games, check-in, QR codes, registrations, schedule, upload
- Divisions: CRUD, seed
- Announcements: list, create (league_owner/admin only), detail, delete
- Sports: sport config lookup
- Settings: payment configuration
- Webhooks: Stripe

### Admin (`apps/admin` — port 4001)

Platform administration for Go Participate staff.

**Pages (9):** Dashboard, billing, features, plans, Stripe config, system health, tenant CRUD.

**API Routes (13):** Admin stats, tenants, plans with Stripe sync, system health, email/SMS test.

### Web (`apps/web` — port 4000)

Marketing site + user registration.

**Pages (7):** Home, login, signup, register, forgot-password, verify-email, pricing.

**API Routes (8):** Auth (register, verify, magic-code), billing (checkout, webhook), plans.

### Storefront (`apps/storefront` — port 4004)

Org public page for uniforms/merchandise (early stage).

**Pages (5):** Home, products list, product detail, cart, checkout.

**API Routes:** None yet — UI only.

---

## Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@goparticipate/auth` | NextAuth v5, JWT, magic codes, player codes, tenant resolution, middleware | Complete |
| `@goparticipate/db` | MongoDB models (35), connection pooling, tenant DB isolation, recipient resolution | Complete |
| `@goparticipate/billing` | Stripe subscriptions, checkout, webhooks, plan management | Complete |
| `@goparticipate/permissions` | RBAC with 3 permission trees (platform/league/org), role templates, feature flags | Complete |
| `@goparticipate/ui` | shadcn/ui components (18) + sidebar system | Complete |
| `@goparticipate/email` | React Email templates (8) + Resend client + SMS | Complete |

---

## Database Models

### Platform DB (`goparticipate_platform`) — 11 models
Tenant, User (with notificationPreferences), Plan, FeatureFlag, Sport, Player, Family, Verification, MagicCode, SystemConfig

### League DBs (`league_<slug>`) — 10 models
Event, Division, Registration, Bracket, Game, Standing, ComplianceRule, Waiver, CheckIn, **Announcement**

### Org DBs (`org_<slug>`) — 11 models
Team, Roster, OrgEvent (7 types + recurrence), Attendance, Message (with ack/delivery), **MessageAck**, Transaction, Stat, UniformOrder, Invite, RegistrationCart

---

## Cross-DB Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `resolveRecipients` | `packages/db/src/utils/resolve-recipients.ts` | Crosses org DB → platform DB to resolve message recipients (roster → players → guardian users) |

---

## Email Templates

| Template | Purpose |
|----------|---------|
| `welcome.tsx` | New user welcome |
| `verify-email.tsx` | Email verification |
| `password-reset.tsx` | Password reset flow |
| `invite.tsx` | Team/org invitation |
| `subscription-confirmed.tsx` | Stripe subscription confirmation |
| `payment-failed.tsx` | Failed payment notification |
| `team-message.tsx` | Team message with ack buttons + urgent banner |
| `league-announcement.tsx` | League announcement with purple branding |

---

## What's Left for Launch

### High Priority
- **Parent-facing dashboard views** — Parents can log in but see the coach dashboard. Need: my kids view, upcoming events, pay dues, RSVP.
- **Email delivery wiring** — Templates built, but message/announcement POST routes have TODOs for triggering actual sends via Resend.
- **Profile/settings pages** — Links exist in sidebar dropdown but no page content.

### Medium Priority
- **RSVP on events** — Model supports it (attendance.rsvp field), needs parent-facing UI.
- **Storefront API** — 5 UI pages built, no backend for uniform orders.
- **Attendance history** — Per-player attendance aggregation over time.

### Deferred (Post-Launch)
- Native mobile app + push notifications
- AI Coach / AI Scout add-ons
- Calendar sync (iCal/Google)
- Document vault encryption (client-side)
- WebSocket real-time messaging
- File attachments on messages
- Scheduled sends / quiet hours
- QR code invites
- Family auto-linking
