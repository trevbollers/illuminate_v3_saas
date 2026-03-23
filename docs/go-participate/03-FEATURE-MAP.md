# Go Participate — Feature Map

## Priority Tiers

### Tier 1: Must Have at Launch

These features are table stakes — you cannot launch without them. They solve the core pain points that MidAmerica 7v7 and their teams experience today on the current goparticipate.com.

---

#### Scheduling & Calendar

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Create events | Practice, game, meeting, other | Coach, Org admin |
| Recurring events | Weekly practices, league schedules | Coach |
| Venue/location | Address with map link | Coach |
| RSVP / availability | Collect who's coming | Parent, Player |
| Calendar sync | Google, Apple, Outlook export | Parent, Coach |
| Conflict alerts | Same family, same day across teams | Parent (family dashboard) |

#### Roster Management

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Player profiles | Name, photo, jersey #, position, DOB | Coach, Parent |
| Parent/guardian linking | Connect family members to player | Parent |
| Medical/allergy notes | Coach-visible health info | Coach (view only) |
| Emergency contacts | Required per player | Parent (enter), Coach (view) |
| Jersey number assignment | Per team, conflict detection | Coach |
| Import from spreadsheet | Migrate existing rosters | Coach, Org admin |

#### Communication

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Team announcements | One-to-many broadcast | Coach |
| Group chat | Coaches, parents, or full team channels | Everyone |
| Push notifications | Mobile alerts for all updates | Everyone |
| Email fallback | For users without the app | System |
| Read receipts | Know who saw announcements | Coach |
| Pin important messages | Keep key info visible | Coach |

#### Attendance

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Event check-in | Mark present/absent at events | Coach |
| RSVP tracking | Coming / not coming / no response | Coach, Parent |
| Attendance history | Per player, per season | Coach |
| Auto-reminders | Nudge non-responders | System |

#### Payments (Basic)

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Collect dues/fees | Stripe-powered payment collection | Org admin, Coach |
| Payment status | Per family tracking | Org admin |
| Payment reminders | Automated nudges for outstanding balances | System |
| Receipts | Auto-generated for parents | Parent |

#### Age Verification & Compliance

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Birth certificate upload | Photo/scan of birth cert | Parent |
| DOB cross-reference | System validates uploaded doc vs entered DOB | System |
| Verification status | Pending → Verified → Expired states | League admin, Coach |
| Portable verification | Verified once, accepted across all leagues | System |
| Waiver collection | Digital signature on league waivers | Parent |
| Medical form collection | Required health info per player | Parent |

#### Team Invites & Connections

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Invite via link | Shareable URL to join team | Coach |
| Invite via QR code | Scan at practice/tryout to join | Coach, Parent |
| Direct invite (email/phone) | Send invite to specific parent | Coach |
| Accept/decline flow | Parent reviews and accepts invite | Parent |
| Multi-team membership | Player can be on multiple teams | System |
| Family auto-linking | Adding a sibling auto-links to family | System |

#### Event Registration (League ↔ Team)

| Feature | Description | Who uses it |
|---------|-------------|-------------|
| Event listing | League publishes events with details | League admin |
| Team registration | Org registers team for league event | Org admin, Coach |
| Roster submission | Select which players attend | Coach |
| Auto-eligibility check | System validates age, verification, docs | System |
| Registration payment | Pay event fees via Stripe | Org admin |
| Roster lock | Deadline after which roster can't change | League admin |

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
