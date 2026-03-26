# 08 — Events & Communication Design

## Event Management

### Event Types
- **Tournament** — Multi-day bracketed competition (primary for MidAmerica 7v7)
- **League Season** — Recurring weekly/biweekly games over weeks/months
- **Showcase** — Exposure events for player evaluation
- **Combine** — Skills testing and measurables

### Event Structure

```
Event
├── Locations[]           — Multiple venues per event
│   └── Fields/Courts[]   — Named surfaces (Field 1, Court A)
├── Days[]                — Multi-day support with per-day start/end times
├── Divisions[]           — Age-group scoped (U10, U12, U14, etc.)
│   ├── Skill Levels      — D1 (top), D2 (beginner), D3, Open
│   └── Pools[]           — Round-robin groups within a division
├── Registrations[]       — Team sign-ups with payment
├── Games[]               — Scheduled on fields, within divisions
├── Brackets[]            — Single-elim, double-elim, round-robin, hybrid
└── Announcements[]       — Event-linked communications
```

### Event Lifecycle

```
draft → published → registration_open → registration_closed → in_progress → completed
                                                                          → canceled (from any state)
```

### Event Settings
- Game duration, half duration, time between games
- Clock type (running vs stop-clock)
- Min/max roster size
- Multi-team player allowance
- Age verification and waiver requirements
- Configurable tiebreaker rules (league admin can lock)

### Default Tiebreaker Rules (7v7)
1. Head-to-head record
2. Point differential
3. Points allowed (fewest wins)
4. Coin flip

### Pricing
- Base registration fee (per team)
- Early bird discount with deadline
- Late fee surcharge with start date
- Refund policy text

### Admin Views
- **Event list** — Card grid with poster, status badges, filters (status, type, search)
- **Event detail** — Tabbed: Overview, Schedule, Divisions, Settings
- **Field schedule grid** — Per-day view showing every field/court with game slots
- **Status progression** — Admin advances event through lifecycle states

---

## Event Communication System

### Research Summary

Best-in-class youth sports communication (TeamSnap, Spond, SportsEngine, Band) reveals:

**The problem**: 54% of parents use 2+ apps for youth sports. App fatigue is real. Notification
unreliability, reply chaos in group threads, and the league-to-team communication gap are the
top pain points.

### Channel Strategy

| Channel | Use Case | Open Rate | Latency |
|---------|----------|-----------|---------|
| SMS | Urgent/time-sensitive (field changes, weather delays, cancellations) | 98% | Instant |
| Push Notification | Reminders (game times, check-in windows) | 60-70% | Near-instant |
| Email | Detailed briefings (schedules, parking maps, rules packets) | 20-30% | Minutes |
| In-App Announcement | Persistent info (pinned event details, bracket updates) | On-visit | Passive |

**Rule**: Urgent = SMS. Timely = Push. Detailed = Email. Persistent = In-app.

### Message Targeting Model

```
Event → Division → Role Filter → Team → Individual
  │        │           │           │         │
  │        │           │           │         └── DM to specific person
  │        │           │           └── All members of a specific team
  │        │           └── Coaches only / Parents only / All
  │        └── All teams in U12 D1
  └── All participants in "Spring Classic 2026"
```

### Key UX Patterns

1. **Event-linked announcements** — Schedule changes auto-notify affected teams/divisions
2. **Broadcast vs conversation separation** — One-way announcements (league admin → all) are
   distinct from two-way threads (team-internal chat)
3. **Read receipts with re-ping** — Admin sees who hasn't read; can re-send to unread only
4. **Pinned event info** — Critical details (parking, check-in location, rules) pinned at top
   of event communication channel
5. **Message templates** — Pre-built templates for common scenarios:
   - Weather delay / cancellation
   - Field/location change
   - Results posted
   - Registration reminder
   - Day-of logistics
6. **Scheduled sends** — "Send day-of reminder at 6:00 AM"
7. **Quiet hours** — No SMS between 9 PM and 7 AM unless emergency-flagged

### V1 Recommended Features

1. Event-linked announcements (CRUD + auto-notify on event changes)
2. Multi-channel delivery (in-app + email; SMS in V2)
3. Audience segmentation (event → division → role)
4. One-way broadcasts (league admin → recipients, no reply chaos)
5. Read/delivery tracking per message
6. Message templates (5-6 common scenarios)
7. Pinned event info card
8. Scheduled sends

### Architecture

```
League DB (league_<slug>):
├── announcements         — Message content, targeting, schedule, template ref
├── announcement_reads    — Per-user read tracking (userId, readAt)
└── message_templates     — Reusable templates with variable substitution

Platform DB (goparticipate_platform):
├── users.contactPreferences  — SMS opt-in, email, push token
└── notification_queue        — Cross-tenant delivery queue (platform brokers)
```

**Key principle**: Messages live in the league DB. Delivery is brokered by the platform because
user contact info (phone, email, push tokens) lives in the platform DB — no tenant has direct
access to another tenant's user PII.

### Cross-Tenant Communication Flow

```
1. League admin creates announcement targeting "U12 D1 coaches"
2. League DB stores announcement with targeting criteria
3. Platform resolves targeting → finds user IDs registered in that division
4. Platform reads user contact preferences from platform DB
5. Platform enqueues delivery (email, push, SMS) per user preference
6. Delivery status written back to league DB (announcement_reads)
```

### Competitive Differentiators (Future)

- **AI-generated recaps** — Auto-summarize game results into parent-friendly updates
- **AI translation** — Auto-translate announcements for multilingual families
- **Smart scheduling** — AI suggests optimal send times based on open-rate patterns
- **Unified inbox** — Parents see all communications across all leagues/orgs in one view
  (platform-level feature, not tenant-scoped)
