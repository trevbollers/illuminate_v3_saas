# 11 — Tryout Feature: Voice-First AI Evaluation System

> Status: Design complete, not yet built
> Priority: High differentiator — leapfrogs Sprocket's tryout workflow with AI

## Overview

A voice-first tryout evaluation system where coaches speak observations into the
platform and AI extracts structured scores, positive/negative notes, and player
assessments. Designed for the field — coaches can't type during tryouts.

## User Flow

```
1. REGISTER + PAY
   Parent registers player for tryout session, pays tryout fee via Stripe.
   Player gets assigned a visible tryout number (bib number).

2. TRYOUT DAY
   Evaluators open mobile web app on the field.
   Speak: "Number 32, great footwork, really like his ability to read
   the defense, needs work on conditioning"

   → Web Speech API captures transcript (browser-native, free, real-time)
   → AI extracts: player #32, positives (footwork, defensive reads),
     negatives (conditioning), suggested category scores
   → Evaluator confirms/adjusts scores on screen
   → Saved immediately

3. MULTI-DAY TRYOUTS
   Day 2: all evaluators see Day 1 notes for every player.
   Continue adding evaluations — scores accumulate.

4. COACHING DECISION
   Head coach reviews aggregated scores across all evaluators.
   Dashboard shows: average scores, agreement/disagreement areas,
   all raw notes, historical bonus points.

   Assigns each player to Team A, B, C, D — or "not invited."

5. INVITE FLOW
   System sends invite to accepted players (reuses existing invite system).
   Player/parent accepts → auto-added to team roster.
   Rejected players see "thank you" — no team assignment.
```

## Data Models

### TryoutSession (org DB)

```typescript
interface ITryoutSession {
  name: string;           // "Fall 2026 Tryouts"
  sport: string;          // "7v7_football"
  season: string;         // "Fall 2026"
  ageGroups: string[];    // ["U12", "U14"]
  dates: Date[];          // Tryout day dates
  fee: number;            // In cents (e.g. 5000 = $50)
  evaluatorIds: ObjectId[];  // Users who can evaluate
  status: "registration" | "active" | "decision" | "closed";
  scoringCategories: {    // Configurable per session
    key: string;          // "athleticism"
    label: string;        // "Athleticism"
    maxScore: number;     // 10
  }[];
  historicalBonusWeight: number; // 0-1, how much past activity matters
  createdBy: ObjectId;
}
```

### TryoutRegistration (org DB)

```typescript
interface ITryoutRegistration {
  sessionId: ObjectId;
  playerId: ObjectId;     // Platform DB player
  playerName: string;
  ageGroup: string;
  tryoutNumber: number;   // Visible bib number, auto-assigned
  paymentStatus: "pending" | "paid" | "waived";
  stripePaymentIntentId?: string;
  historicalBonus: number; // Auto-calculated from past org activity
  historicalSummary: {
    seasonsWithOrg: number;
    totalGamesPlayed: number;
    attendanceRate: number;  // 0-1
    previousTryoutScores?: number; // avg from last year
  };
}
```

### TryoutEvaluation (org DB)

```typescript
interface ITryoutEvaluation {
  sessionId: ObjectId;
  registrationId: ObjectId;
  playerId: ObjectId;
  tryoutNumber: number;
  evaluatorId: ObjectId;
  evaluatorName: string;
  sessionDay: number;     // 1 = first tryout day, 2 = second, etc.

  // Raw voice input
  rawTranscript: string;  // Full speech-to-text output

  // AI-extracted structured data
  positives: string[];    // ["great footwork", "reads defense well"]
  negatives: string[];    // ["needs conditioning work"]
  scores: {
    category: string;     // "athleticism"
    score: number;        // 8
    aiSuggested: number;  // What AI suggested (for audit trail)
  }[];
  overallSentiment: "positive" | "neutral" | "negative";

  // Metadata
  aiModel?: string;       // Which model processed this
  aiProcessedAt?: Date;
  manuallyEdited: boolean; // Did evaluator change AI suggestions?
}
```

### TryoutDecision (org DB)

```typescript
interface ITryoutDecision {
  sessionId: ObjectId;
  registrationId: ObjectId;
  playerId: ObjectId;
  playerName: string;
  decision: "team_a" | "team_b" | "team_c" | "not_invited";
  teamId?: ObjectId;      // Assigned team (if invited)
  decidedBy: ObjectId;
  decidedAt: Date;
  inviteId?: ObjectId;    // Links to existing Invite model
  inviteStatus?: "pending" | "accepted" | "rejected";
  notes?: string;         // Internal coaching notes
}
```

## Voice-to-Evaluation Pipeline

```
┌─────────────────────────────────────────────────────┐
│  EVALUATOR'S PHONE (mobile web)                     │
│                                                     │
│  🎤 "Number 32, great footwork, really like his     │
│      ability to read the defense, needs work on     │
│      conditioning"                                   │
│                                                     │
│  → Web Speech API (browser-native, free)            │
│  → Transcript saved immediately (no data loss)      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  AI EXTRACTION (BYO API key — league/org's Claude)  │
│                                                     │
│  System prompt includes:                            │
│  - Scoring categories for this session              │
│  - Scale (1-10)                                     │
│  - Player roster with tryout numbers                │
│                                                     │
│  Extracts:                                          │
│  - Player number: 32                                │
│  - Positives: ["footwork", "defensive reads"]       │
│  - Negatives: ["conditioning"]                      │
│  - Suggested scores:                                │
│    Skill 8/10, IQ 8/10, Athleticism 5/10           │
│  - Sentiment: positive                              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  EVALUATOR CONFIRMS                                 │
│                                                     │
│  #32 — "Great footwork, reads defense well"         │
│                                                     │
│  Skill:       [████████░░] 8  ✓                    │
│  IQ:          [████████░░] 8  ✓                    │
│  Athleticism: [█████░░░░░] 5  → 6 (adjusted)      │
│                                                     │
│  [Save & Next]                                      │
└─────────────────────────────────────────────────────┘
```

## AI Integration (BYO Keys)

The AI extraction uses the league/org's own API key configured in their tenant
settings. This is consistent with the platform's AI add-on model where tenants
bring their own Anthropic (or other) API keys.

```typescript
// Tenant settings already have:
settings.ai = {
  provider: "anthropic",
  apiKey: "sk-ant-...", // encrypted at rest
  model: "claude-sonnet-4-6",
}
```

If no AI key is configured, the voice transcript is still captured and stored.
Evaluators manually enter scores without AI suggestions. The feature degrades
gracefully — voice capture still saves time vs typing.

## Historical Bonus Calculation

When a player registers for tryouts, the system auto-calculates a bonus from
their history with the organization:

```typescript
function calculateHistoricalBonus(playerId, orgSlug): HistoricalSummary {
  // Pull from org DB
  const rosters = Roster.find({ playerId, isActive: true });
  const attendance = Attendance.find({ playerId });
  const previousTryouts = TryoutRegistration.find({ playerId });

  return {
    seasonsWithOrg: rosters.distinctSeasons.length,
    totalGamesPlayed: attendance.filter(a => a.eventType === "game").length,
    attendanceRate: attendance.present / attendance.total,
    previousTryoutScores: previousTryouts.avgScore || null,
  };
}

// Bonus weight is configurable per session (0-1)
// e.g. 0.1 = 10% weight on historical, 90% on tryout performance
```

## Cross-Season Review

When a player tries out again next season, evaluators see:

```
┌─────────────────────────────────────────────────────┐
│  #32 — Marcus Johnson                               │
│  Age: 13 (U14) | 3rd year with KC Thunder           │
│  Attendance: 94% | Games: 28                         │
│                                                     │
│  LAST SEASON TRYOUT (Fall 2025):                    │
│  ┌─────────────────────────────────────┐            │
│  │ Avg Score: 7.2/10                   │            │
│  │ Strengths: footwork, defensive IQ   │            │
│  │ Growth areas: conditioning (flagged) │            │
│  │ Assigned: Team A (U12)              │            │
│  │ 3 evaluators, all positive          │            │
│  └─────────────────────────────────────┘            │
│                                                     │
│  THIS SEASON:                                       │
│  🎤 [Tap to evaluate]                               │
└─────────────────────────────────────────────────────┘
```

## Implementation Plan

| Step | What | Where | Depends On |
|------|------|-------|-----------|
| 1 | Data models (TryoutSession, Registration, Evaluation, Decision) | `packages/db` | Nothing |
| 2 | Tryout session CRUD API | `apps/dashboard` | Step 1 |
| 3 | Registration + payment (reuse existing cart/Stripe) | `apps/dashboard` | Step 2 |
| 4 | Tryout number auto-assignment | Step 3 API | Step 3 |
| 5 | Voice capture component (Web Speech API) | `apps/dashboard` | Nothing |
| 6 | AI transcript extraction (BYO key) | `apps/dashboard` API | Step 1, 5 |
| 7 | Evaluator scoring UI (mobile-first) | `apps/dashboard` | Step 5, 6 |
| 8 | Historical bonus calculator | `packages/db/utils` | Step 1 |
| 9 | Multi-evaluator dashboard + consensus view | `apps/dashboard` | Step 7 |
| 10 | Decision UI + invite trigger | `apps/dashboard` | Step 9 |
| 11 | Cross-season review view | `apps/dashboard` | Step 8 |

Steps 1-4 are mostly wiring existing patterns. Steps 5-7 are the core innovation.
Steps 8-11 are polish that can ship iteratively.

## Why This Beats Sprocket

Sprocket has tryout evaluation, but it's form-based — coaches tap scores on a screen.
Go Participate's approach:

1. **Voice-first** — speak, don't type. Coaches stay focused on the field.
2. **AI extraction** — structured data from natural language. No rigid forms.
3. **Multi-evaluator consensus** — see where evaluators agree/disagree.
4. **Historical context** — automatic bonus for returning players.
5. **Cross-season trajectory** — "did they improve on last year's flags?"
6. **Graceful degradation** — works without AI keys (just stores transcript).
