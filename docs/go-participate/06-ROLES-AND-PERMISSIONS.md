# Go Participate — Roles & Permissions

## Platform Roles

```
PlatformRole = "gp_admin" | "gp_support" | "user"
```

| Role | Level | Description |
|------|-------|-------------|
| `gp_admin` | 100 | Full platform control (super admin portal) |
| `gp_support` | 50 | View tenants, assist users, no billing/config changes |
| `user` | 0 | Regular user (default, no platform privileges) |

---

## Tenant Types

```
TenantType = "league" | "organization"
```

Teams are NOT separate tenants — they are sub-units within an organization.

---

## League Tenant Roles

| Role | Level | Description |
|------|-------|-------------|
| `league_owner` | 100 | Full league control, billing, settings |
| `league_admin` | 80 | Event management, verification, compliance |
| `league_staff` | 60 | Score entry, check-in, day-of operations |
| `league_viewer` | 20 | View-only access to league data |

### League Permissions

```
EVENTS
├── events.view          — View event listings and details
├── events.create        — Create new events (tournaments, seasons)
├── events.edit          — Modify event details, dates, rules
├── events.delete        — Delete/cancel events
├── events.publish       — Publish events to public discovery

REGISTRATIONS
├── registrations.view   — View team registrations
├── registrations.manage — Approve/deny registrations, manage waitlist
├── registrations.refund — Process registration refunds

VERIFICATION
├── verification.view    — View player verification statuses
├── verification.review  — Manually review/approve verifications
├── verification.override — Override verification decisions

COMPLIANCE
├── compliance.view      — View coach certs, waivers
├── compliance.manage    — Set requirements, manage waiver templates

BRACKETS & SCHEDULING
├── brackets.view        — View brackets and schedules
├── brackets.manage      — Create/edit brackets, assign fields, seed teams

SCORING
├── scoring.view         — View scores and standings
├── scoring.enter        — Enter game scores and stats
├── scoring.edit         — Edit previously entered scores

FINANCIALS
├── financials.view      — View revenue, registration fees
├── financials.manage    — Manage payouts, refunds, pricing

SETTINGS
├── settings.view        — View league settings
├── settings.manage      — Modify league settings, divisions, rules
├── settings.billing     — Manage league subscription billing

TEAM (league staff)
├── team.view            — View league staff members
├── team.invite          — Invite new league staff
├── team.manage          — Change roles, remove staff
```

---

## Organization Tenant Roles

| Role | Level | Description |
|------|-------|-------------|
| `org_owner` | 100 | Full org control, billing, all teams |
| `org_admin` | 80 | Manage all teams, staff, financials |
| `head_coach` | 60 | Full team management, roster, registration |
| `assistant_coach` | 40 | Attendance, communication, lineup |
| `team_manager` | 40 | Admin tasks — payments, communication, sizing |
| `viewer` | 20 | View-only (e.g., board member) |

### Organization Permissions

```
ROSTER
├── roster.view          — View players on team roster
├── roster.add           — Add players (via invite or manual)
├── roster.edit          — Edit player info (jersey #, position)
├── roster.remove        — Remove players from roster

SCHEDULING
├── schedule.view        — View team schedule
├── schedule.create      — Create practices, scrimmages, meetings
├── schedule.edit        — Modify event details
├── schedule.delete      — Cancel/delete events

COMMUNICATION
├── comms.view           — View team messages
├── comms.send           — Send messages and announcements
├── comms.manage         — Pin messages, manage channels

ATTENDANCE
├── attendance.view      — View attendance records
├── attendance.mark      — Check in players at events

REGISTRATION (for league events)
├── registration.view    — View event registration status
├── registration.submit  — Register team for league events
├── registration.manage  — Edit submitted rosters, manage payment

PAYMENTS
├── payments.view        — View payment status per family
├── payments.collect     — Send payment requests, set dues
├── payments.manage      — Process refunds, manage billing

STATS
├── stats.view           — View game stats and history
├── stats.enter          — Enter game scores and player stats
├── stats.edit           — Edit previously entered stats

PLAYER DEVELOPMENT
├── development.view     — View player assessments
├── development.create   — Create evaluations and goals
├── development.manage   — Manage development programs

UNIFORMS
├── uniforms.view        — View uniform order status
├── uniforms.initiate    — Start uniform order, collect sizes
├── uniforms.manage      — Submit orders, manage partner catalog

TEAM MANAGEMENT (org-level)
├── teams.view           — View all teams in org
├── teams.create         — Create new teams
├── teams.manage         — Edit team settings, assign coaches

STAFF
├── staff.view           — View coaches and managers
├── staff.invite         — Invite new staff members
├── staff.manage         — Change roles, remove staff

SETTINGS
├── settings.view        — View org settings
├── settings.manage      — Modify org settings
├── settings.billing     — Manage org subscription billing

FINANCIALS (org-level)
├── financials.view      — View org-wide financial data
├── financials.manage    — Manage budgets, expenses, reports
```

---

## Role → Permission Matrix (Organization)

| Permission | Owner | Admin | Head Coach | Asst Coach | Manager | Viewer |
|-----------|-------|-------|------------|------------|---------|--------|
| roster.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| roster.add | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| roster.edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| roster.remove | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| schedule.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| schedule.create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| schedule.edit | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| schedule.delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| comms.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| comms.send | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| comms.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| attendance.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| attendance.mark | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| registration.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| registration.submit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| registration.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| payments.view | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| payments.collect | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| payments.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| stats.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| stats.enter | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| stats.edit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| development.view | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| development.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| development.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| uniforms.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| uniforms.initiate | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| uniforms.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| teams.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| teams.create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| teams.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| staff.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| staff.invite | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| staff.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| settings.view | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| settings.manage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings.billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| financials.view | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| financials.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Note**: Owners always bypass permission checks (hardcoded `true`), same as Illuminate pattern. Custom permission overrides can be stored per membership.

---

## Family / Parent Permissions

Parents don't have "roles" in the traditional sense. Their access is scoped by family relationships:

```
PARENT CAN:
├── View/edit their own children's profiles
├── View schedules for teams their children are on
├── RSVP for their children's events
├── View/pay dues owed by their family
├── Upload documents for their children
├── Accept/decline team invites for their children
├── View chat messages on their children's teams
├── Send chat messages on their children's teams
├── View their children's stats and development
├── Order uniforms for their children
└── View game results and standings

PARENT CANNOT:
├── View other families' payment status
├── View other players' medical info
├── View verification documents of other players
├── Modify roster or team settings
├── Create/edit team events
├── Enter stats or scores
└── Access org-level financials
```
