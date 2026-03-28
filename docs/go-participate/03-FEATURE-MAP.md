# Go Participate — Feature Map

> **Legend**: BUILT = fully implemented (API + UI), API = backend done / UI pending,
> PARTIAL = some sub-features built, DEFERRED = planned but not started

## Priority Tiers

### Tier 1: Must Have at Launch

These features are table stakes — you cannot launch without them. They solve the core pain points that MidAmerica 7v7 and their teams experience today on the current goparticipate.com.

---

#### Scheduling & Calendar — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Create events | Practice, game, scrimmage, meeting, tournament, tryout, other | Coach, Org admin | BUILT |
| Recurring events | Daily, weekly, biweekly, monthly with day-of-week filter | Coach | BUILT |
| Venue/location | Address field on events | Coach | BUILT |
| Calendar month view | Color-coded event chips with overflow | Coach, Parent | BUILT |
| Daily list view | Chronological event cards with type badges | Coach, Parent | BUILT |
| Game details | Opponent, home/away, score entry with auto outcome | Coach | BUILT |
| RSVP / availability | Collect who's coming | Parent, Player | DEFERRED |
| Calendar sync | Google, Apple, Outlook export | Parent, Coach | DEFERRED |
| Conflict alerts | Same family, same day across teams | Parent (family dashboard) | DEFERRED |

#### Roster Management — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Player profiles | Name, photo, jersey #, position, DOB | Coach, Parent | BUILT |
| Parent/guardian linking | Connect family members to player | Parent | BUILT |
| Medical/allergy notes | Coach-visible health info | Coach (view only) | BUILT |
| Emergency contacts | Required per player | Parent (enter), Coach (view) | BUILT |
| Jersey number assignment | Per team, conflict detection on PATCH | Coach | BUILT |
| Import from spreadsheet | CSV drag-and-drop with preview | Coach, Org admin | BUILT |

#### Communication — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Team messages | Channel-based (team/parents/coaches/org) with inbox tabs | Coach | BUILT |
| Acknowledgements | Configurable response options, ack tracker with progress bar | Coach, Parent | BUILT |
| League announcements | League → org admin broadcasts (create + view) | League admin, Org admin | BUILT |
| Email templates | Team message + league announcement React Email templates | System | BUILT |
| Read tracking | Unread dots, read-on-open, sidebar badge with polling | Coach, Parent | BUILT |
| Pin messages | Toggle pin on message detail | Coach | BUILT |
| Push notifications | Mobile alerts for all updates | Everyone | DEFERRED (native app) |
| Email delivery wiring | Trigger sends from message POST route | System | PARTIAL (templates built, send TODO) |

#### Attendance — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Event check-in | Mark present/absent/late/excused per player | Coach | BUILT |
| Roster pre-fill | Initialize attendance from active roster | Coach | BUILT |
| Bulk status update | Mark all present, tap-to-toggle per player | Coach | BUILT |
| Stats summary | Present/late/absent/excused counts | Coach | BUILT |
| RSVP tracking | Coming / not coming / no response | Coach, Parent | API (model has rsvp field, no parent UI) |
| Attendance history | Per player, per season | Coach | DEFERRED |
| Auto-reminders | Nudge non-responders | System | DEFERRED |

#### Payments (Basic) — PARTIAL

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Stripe integration | Subscriptions, checkout, webhooks, portal | Org admin | BUILT |
| Payment settings | Connect Stripe, configure defaults | Org admin | BUILT |
| Event registration fees | Pay via Stripe at checkout | Org admin | BUILT |
| Collect dues/fees | Per-family payment collection | Org admin, Coach | DEFERRED |
| Payment status | Per family tracking | Org admin | DEFERRED |
| Payment reminders | Automated nudges for outstanding balances | System | DEFERRED |
| Receipts | Auto-generated for parents | Parent | DEFERRED |

#### Age Verification & Compliance — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Verification model | Status tracking (unverified/pending/verified/expired) | League admin | BUILT |
| Verification page | League admin review UI | League admin | BUILT |
| Compliance rules | Per-league configurable requirements | League admin | BUILT |
| Waiver model | Digital waiver collection | Parent | BUILT |
| Birth certificate upload | Photo/scan of birth cert | Parent | DEFERRED (vault) |
| DOB cross-reference | System validates uploaded doc vs entered DOB | System | DEFERRED (vault) |

#### Team Invites & Connections — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Invite via link | Token-based URL with 7-day expiry | Coach | BUILT |
| Accept/decline flow | Landing page with org/team/role preview, auto-roster | Parent | BUILT |
| Role mapping | Invite role → org membership role on accept | System | BUILT |
| Player code sessions | Scoped player_view with restricted nav + banner | Player | BUILT |
| Invite via QR code | Scan at practice/tryout to join | Coach, Parent | DEFERRED |
| Family auto-linking | Adding a sibling auto-links to family | System | DEFERRED |

#### Event Registration (League ↔ Team) — BUILT

| Feature | Description | Who uses it | Status |
|---------|-------------|-------------|--------|
| Event listing | Browse league events by sport | League admin, Org admin | BUILT |
| Team registration | Register team + submit roster for event | Org admin, Coach | BUILT |
| Registration cart | Multi-item cart with Stripe checkout | Org admin | BUILT |
| Divisions & brackets | Create divisions, seed brackets, schedule games | League admin | BUILT |
| QR check-in | Scan players at event with validation | League admin | BUILT |
| Auto-eligibility check | System validates age, verification, docs | System | PARTIAL |
| Roster lock | Deadline after which roster can't change | League admin | DEFERRED |

---

### Tier 2: Differentiators (What Makes You Win)

These features create separation from TeamSnap/Spond/GameChanger and justify paid tiers.

---

#### AI Coach Assistant

| Feature | Description | Tier |
|---------|-------------|------|
| Practice planner | "Plan a 90-min practice for U12 focused on passing" → drill sequence, timing, equipment | AI add-on |
| Message drafting | "Write a rain delay notice for Saturday" → ready-to-send message | AI add-on |
| Lineup builder | "Build a lineup — Tommy and Sarah are out" → balanced lineup | AI add-on |
| Game recap generator | Generate natural language recap from box score data | AI add-on |
| Drill recommendations | Context-aware suggestions based on team needs | AI add-on |

#### Family Dashboard

| Feature | Description | Tier |
|---------|-------------|------|
| All-kids-all-teams view | Single dashboard across every child's teams | Free |
| Weekly AI summary | "What do I need to know this week?" | AI add-on |
| Smart calendar | Travel time between venues, conflict detection | Pro |
| Payment status rollup | Outstanding balances across all teams | Free |
| Unified notifications | One stream, not per-team noise | Free |

#### Player Development

| Feature | Description | Tier |
|---------|-------------|------|
| Skill assessments | Coach-entered evaluations per period | Pro |
| Progress tracking | Season-over-season improvement charts | Pro |
| Development goals | Coach + player goal setting | Pro |
| AI player reports | End-of-season development summaries | AI add-on |

#### Smart Scheduling

| Feature | Description | Tier |
|---------|-------------|------|
| Weather alerts | Flag outdoor events with bad forecast | Pro |
| Auto-reschedule suggestions | Suggest open slots when conflicts arise | Pro |
| Family-wide conflicts | Detect sibling schedule overlaps | Free |

---

### Tier 3: Growth Features (Post-Launch / Premium)

---

#### Game Day & Stats

| Feature | Description | Tier |
|---------|-------------|------|
| Live scoring | Sport-specific stat entry during games | Pro |
| Box score generation | Auto-formatted game summaries | Pro |
| Season stat aggregation | Cumulative player/team stats | Pro |
| AI post-game recaps | Natural language game summaries | AI add-on |
| Stat leaderboards | Rankings within league/division | League |

#### Registration & Onboarding (Org Level)

| Feature | Description | Tier |
|---------|-------------|------|
| Custom registration forms | Per-season registration with custom fields | Org |
| Multi-child family registration | Single flow for siblings | Org |
| Tryout evaluation workflows | Score and rank tryout participants | Org |
| Waitlist management | Auto-notify when spots open | Org |
| Auto-team assignment | Distribute players to teams by skill/age | Org |

#### Financial Management

| Feature | Description | Tier |
|---------|-------------|------|
| Team budgeting | Plan season expenses | Org |
| Expense tracking | Receipt capture and categorization | Org |
| Fundraiser creation | Campaign pages with goal tracking | Org |
| Sponsor management | Track sponsorship commitments | Org |
| Treasurer reporting | Financial summaries for board | Org |

#### Your Prep Sports Integration

| Feature | Description | Tier |
|---------|-------------|------|
| Auto-publish results | Tournament results → YPS site | League |
| Rankings engine | Player/team rankings from stats | League |
| Event calendar | Upcoming events listed on YPS | League |
| Recruiting profiles | Opt-in player profiles for HS age | Premium family |
| AI game recaps | Auto-generated articles from box scores | League |

---

## Sport-Specific Features

### 7v7 Football

```
ROSTER RULES
├── 7 on field, typically 12–15 roster
├── Age divisions: U8, U10, U12, U14, U16, U18
├── Age cutoff date verification (birth cert)
├── Grade-based eligibility option
└── Multi-roster rules (configurable per league)

POSITIONS
├── QB
├── Center
├── WR (x3–4)
├── Safety
├── Corner (x2)
├── Linebacker
└── Rusher

GAME FORMAT (configurable per league)
├── 2 × 20-min halves (default)
├── Running clock vs stop clock option
├── No kickoffs — start at 40-yard line
├── No punting
├── First downs at 20-yard and 40-yard lines
├── TD = 6 pts
├── PAT from 5 = 1 pt, PAT from 10 = 2 pts
└── Interception returns allowed

STAT TRACKING
├── Passing: completions, attempts, yards, TDs, INTs
├── Receiving: catches, yards, TDs
├── Defensive: INTs, pass breakups (PBUs), sacks
├── Team: score, turnovers, penalties
└── NO rushing stats (7v7 = no running plays)

EVENT TYPES
├── Tournament — bracket-based, pool play → elimination
├── League season — round-robin schedule
├── Showcase — exposure events, may not have standings
├── Combine — individual player evaluation
└── Tryout/practice — org-level, not league events
```

### Basketball

```
ROSTER RULES
├── 5 on court, typically 10–12 roster
├── Age divisions: U8, U10, U12, U14, U16, U18
├── Grade-based or age-based eligibility
└── Height/weight classes (some leagues)

POSITIONS
├── PG — Point Guard
├── SG — Shooting Guard
├── SF — Small Forward
├── PF — Power Forward
└── C — Center

GAME FORMAT (configurable per league)
├── 4 × 8-min quarters OR 2 × 20-min halves
├── Running clock until final 2 minutes
├── 5 personal fouls → disqualification
├── Team foul bonus at 7
├── Timeouts per half
└── Overtime rules (configurable)

STAT TRACKING
├── Points, FGM/FGA, 3PM/3PA, FTM/FTA
├── Rebounds (OFF/DEF/TOT)
├── Assists, Steals, Blocks
├── Turnovers, Personal fouls
├── Minutes played
└── Plus/minus (+/-)

EVENT TYPES
├── Tournament — pool play → bracket
├── League season — scheduled games
├── Showcase / camp — skills-focused
└── Combine — measurables + skills testing
```

---

## Mobile vs Desktop — Who Needs What

```
                        MOBILE                    DESKTOP
                     (phone/tablet)              (browser)

COACH AT             ┌─────────────┐
THE FIELD            │ Quick lineup │
                     │ Attendance   │
                     │ Live scoring │
                     │ Sub tracking │
                     │ AI assistant │
                     └─────────────┘

COACH AT                                      ┌──────────────────┐
HOME                                          │ Season planning   │
                                              │ Practice builder  │
                                              │ Stat analysis     │
                                              │ Player reports    │
                                              │ Budget management │
                                              └──────────────────┘

PARENT               ┌─────────────┐
ALWAYS ON            │ Schedule     │
PHONE                │ RSVP        │
                     │ Chat        │
                     │ Directions  │
                     │ Pay dues    │
                     │ View stats  │
                     │ Family dash │
                     └─────────────┘

LEAGUE ADMIN                                  ┌──────────────────┐
BACK OFFICE                                   │ Event creation    │
                                              │ Age verification  │
                                              │ Bracket building  │
                                              │ Registration mgmt │
                                              │ Financial reports │
                                              │ Compliance        │
                                              └──────────────────┘

ORG DIRECTOR                                  ┌──────────────────┐
BACK OFFICE                                   │ Multi-team mgmt   │
                                              │ Registration      │
                                              │ Financials        │
                                              │ Tryout management │
                                              └──────────────────┘

BOTH EQUALLY         ┌──────────────────────────────────────────┐
                     │ Calendar · Roster · Chat · Notifications │
                     │ Payment status · AI Coach · Lineup       │
                     └──────────────────────────────────────────┘
```
