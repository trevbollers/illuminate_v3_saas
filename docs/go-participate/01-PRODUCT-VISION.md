# Go Participate — Product Vision

## What This Is

**Go Participate** is a mobile-first youth sports team management platform for 7v7 football and basketball. It replaces the fragmented stack of TeamSnap + GameChanger + Venmo + group texts with a single, AI-enhanced platform that connects leagues, organizations, teams, coaches, and families.

**Domain**: goparticipate.com
**Media arm**: Your Prep Sports (yourprepsports.com)
**Launch league**: MidAmerica 7v7 Football (midamerica7v7.org)
**Sports at launch**: 7v7 Football, Basketball

---

## The Problem

Youth sports management is broken:

| Who | Pain |
|-----|------|
| **Volunteer coaches** | 5–10 hrs/week on logistics across 3+ apps instead of coaching |
| **Parents** | Juggling TeamSnap + GameChanger + Venmo + group texts per kid, per team |
| **League admins** | Age verification is manual, registration is clunky, data is duplicated everywhere |
| **Organizations** | No unified view across multiple teams, seasons, or financials |

The existing tools are either aging (TeamSnap), paywalling parents (GameChanger), overpriced (SportsEngine at $79/mo), or have no revenue model (Spond). Nobody has built an AI-native, mobile-first platform that actually reduces admin burden.

---

## The Ecosystem

Go Participate isn't just a SaaS tool — it's a **closed-loop ecosystem**:

```
League runs events (MidAmerica 7v7)
    → Teams must register through Go Participate
        → Parents onboard with verified player profiles
            → Families buy uniforms through partner program
                → Your Prep Sports covers the events
                    → Content drives awareness → more leagues join
```

Every piece feeds the others. The league forces adoption, the platform creates stickiness, the partner program generates revenue, and the media arm drives organic growth.

---

## The Closed-Loop Flywheel

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   STEP 1: MidAmerica 7v7 lists events on Go Participate     │
│           (tournaments, league seasons, combines)            │
│                          │                                   │
│                          ▼                                   │
│   STEP 2: Teams MUST register through Go Participate         │
│           (age verification, roster, payment)                │
│                          │                                   │
│                          ▼                                   │
│   STEP 3: Teams start using GP for their own management      │
│           (practices, non-league games, communication)       │
│                          │                                   │
│                          ▼                                   │
│   STEP 4: Parents onboard → family dashboard → tell others   │
│                          │                                   │
│                          ▼                                   │
│   STEP 5: Other leagues see MidAmerica 7v7 on the platform   │
│           → list their events → more teams onboard           │
│                          │                                   │
│                          ▼                                   │
│   STEP 6: Uniform partner + Your Prep Sports coverage        │
│           → revenue diversification + content flywheel       │
│                          │                                   │
│                          └──────── REPEAT ───────────────────│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Competitive Positioning

```
                    HIGH AUTOMATION / AI
                           ▲
                           │
                    ┌──────┼──────────────┐
                    │  GO  │              │
                    │PARTI-│  OTTO SPORT  │
                    │CIPATE│  (unproven)  │
                    │  ★★★ │              │
                    └──────┼──────────────┘
                           │
     INDIVIDUAL   ─────────┼──────────────────  ORGANIZATION
     TEAM FOCUS            │                    FOCUS
                           │
            ┌──────────┐   │   ┌─────────────┐
            │ TeamSnap │   │   │SportsEngine │
            │ Spond    │   │   │ LeagueApps  │
            │GameChange│   │   │ PlayMetrics │
            └──────────┘   │   └─────────────┘
                           │
                           ▼
                    LOW AUTOMATION / MANUAL
```

**Our quadrant**: Individual team focus + High AI/automation — nobody owns this space.

---

## Key Differentiators

1. **Verify once, play everywhere** — Player age verification travels with the player across all leagues and seasons. No re-uploading documents.

2. **Family dashboard** — One view across ALL kids, ALL teams, ALL sports. "What do I need to know this week?"

3. **League-driven adoption** — MidAmerica 7v7 requires Go Participate for registration, which forces team adoption organically.

4. **Mobile-first** — Built for the sideline, not the desktop. Coaches and parents live on their phones.

5. **AI coach assistant** — Practice plans, lineups, game recaps generated from platform data.

6. **Partner tier** — Uniform partner integration creates a unique discount-for-commitment model that increases stickiness and diversifies revenue.

7. **Clean data architecture** — Database-per-tenant isolation, no duplicate player records, verified identities.

---

## Brand Properties

| Property | Domain | Purpose |
|----------|--------|---------|
| **Go Participate** | goparticipate.com | Core platform — team management, registration, operations |
| **Your Prep Sports** | yourprepsports.com | Media arm — event coverage, rankings, recruiting exposure |
| **MidAmerica 7v7** | midamerica7v7.org | Launch league tenant — first league operator on the platform |
