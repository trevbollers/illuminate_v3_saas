# Go Participate — User Flows

## Flow 1: Age Verification (Verify Once, Play Everywhere)

This is the #1 pain point to solve. Currently manual, error-prone, and repeated for every league.

### Player Onboarding (One Time)

```
Parent creates Go Participate account
    │
    ├── Email/password or Google/Apple sign-in
    │
    ▼
Parent adds child as a player
    │
    ├── Enter: first name, last name, DOB, gender
    ├── Upload: recent photo
    ├── Upload: birth certificate OR passport
    │   └── Accepted formats: photo, scan, PDF
    ├── Enter: medical info (allergies, conditions, medications)
    ├── Enter: emergency contacts (min 2)
    │
    ▼
SYSTEM: Auto-verification attempt
    │
    ├── OCR reads DOB from uploaded document
    ├── Cross-reference: does OCR DOB match entered DOB?
    │
    ├── ✅ MATCH
    │   └── Status: VERIFIED
    │       ├── Verified badge appears on player profile
    │       ├── Verification valid for 12 months (or until doc expires)
    │       └── Parent notified: "Tommy is verified!"
    │
    ├── ⚠️  UNCLEAR (OCR confidence low)
    │   └── Status: PENDING REVIEW
    │       ├── Flagged for league admin manual review
    │       ├── Admin views document + entered data
    │       └── Admin approves or requests re-upload
    │
    └── ❌ MISMATCH
        └── Status: REJECTED
            ├── Parent notified: "DOB doesn't match document"
            ├── Parent can re-upload or correct DOB
            └── Escalate to manual review if repeated failure

VERIFICATION VISIBILITY
    │
    ├── Parent: sees full profile + verification status
    ├── League admin: sees verification status + can view documents
    ├── Org admin: sees verification status + age
    ├── Coach: sees verified badge only (no documents)
    └── Other parents: see nothing (privacy)
```

### Event Registration (Every Time — Seamless)

```
Coach registers KC Thunder U12 for MidAmerica 7v7 Summer Tournament
    │
    ▼
Select roster from org's players
    │
    ├── System auto-checks EACH player:
    │
    │   ├── ✅ Age eligible for U12 division?
    │   │   └── DOB on or after cutoff date
    │   │
    │   ├── ✅ Verification current?
    │   │   └── Verified within last 12 months
    │   │
    │   ├── ✅ Medical forms complete?
    │   │   └── All required fields filled
    │   │
    │   ├── ✅ Waiver signed by parent/guardian?
    │   │   └── League-specific waiver for this event
    │   │
    │   └── ✅ No roster lock violations?
    │       └── Player not locked to another team in this league
    │
    ▼
RESULTS DASHBOARD (coach sees in real-time)
    │
    ├── ✅ Tommy Smith — All clear
    ├── ✅ Sarah Jones — All clear
    ├── ❌ Jake Wilson — DOB: 03/15/2011 → he's U14, not U12
    │   └── "Jake is 14 years old. He is not eligible for U12."
    ├── ⚠️  Maria Garcia — Waiver not signed
    │   └── Parent auto-notified: "Please sign the waiver for Summer Tournament"
    ├── ⚠️  Chris Brown — Verification expired
    │   └── Parent auto-notified: "Please re-upload birth certificate"
    │
    ▼
Once all players clear → Submit roster → Pay registration fee → Done
    │
    └── No manual paperwork. No emailing PDFs. No spreadsheets.
```

---

## Flow 2: Team Invites & Player Connections

### Coach Invites Parent/Player to Team

```
METHOD 1: SHARE LINK
─────────────────────
Coach opens KC Thunder U12 roster
    → Taps "Invite Players"
    → Copies invite link
    → Pastes in text message, email, or social media
    │
    Parent clicks link
    → If no account: creates account → adds player → joins team
    → If has account: selects which child → joins team
    → If player already verified: instant join ✅
    → If player not verified: joins team, verification pending

METHOD 2: QR CODE (at practice/tryout)
──────────────────────────────────────
Coach opens KC Thunder U12 roster
    → Taps "Invite Players"
    → Shows QR code on phone screen
    │
    Parent scans QR code with phone camera
    → Opens Go Participate (or app store if not installed)
    → Same flow as link invite above
    │
    Benefit: 15 parents at tryout can all scan same QR code

METHOD 3: DIRECT INVITE
────────────────────────
Coach opens KC Thunder U12 roster
    → Taps "Invite Players"
    → Enters parent email or phone number
    │
    System sends invite via email + SMS
    → Parent clicks "Accept Invite"
    → Same account/player flow as above

METHOD 4: PARENT-INITIATED
──────────────────────────
Parent searches for "KC Thunder" on Go Participate
    → Finds team → Taps "Request to Join"
    → Coach receives notification
    → Coach approves/denies
    → If approved, parent selects which child → joins team
```

### Family Auto-Linking

```
Parent adds first child (Tommy, age 12)
    → Tommy's profile created under parent's family

Parent adds second child (Sarah, age 10)
    → Sarah auto-linked to same family
    → Family dashboard now shows both kids

Parent 2 (spouse) creates account
    → Enters Tommy's DOB + last 4 of birth cert #
    → System matches to existing player
    → Parent 2 linked to same family
    → Both parents see both kids in family dashboard
    → Both parents receive notifications

RESULT:
┌─────────────────────────────────┐
│ Johnson Family Dashboard        │
│                                 │
│ 👤 Tommy (12) — KC Thunder U12 │
│    Next: Practice Tue 6pm      │
│    Status: ✅ Verified          │
│    Dues: ✅ Paid                │
│                                 │
│ 👤 Sarah (10) — KC Thunder U10 │
│    Next: Game Sat 9am          │
│    Status: ⚠️  Waiver needed    │
│    Dues: ❌ $150 outstanding    │
│                                 │
│ 📅 This Week:                   │
│    Tue 6pm — Tommy practice    │
│    Thu 6pm — Sarah practice    │
│    Sat 9am — Sarah game        │
│    Sat 2pm — Tommy tournament  │
│    ⚠️  Sat: 30min between games │
│                                 │
└─────────────────────────────────┘
```

---

## Flow 3: MidAmerica 7v7 Event Registration (End to End)

### League Creates Event

```
MidAmerica 7v7 admin creates "Summer Showdown 2026"
    │
    ├── Event details:
    │   ├── Type: Tournament
    │   ├── Sport: 7v7 Football
    │   ├── Date: July 18–19, 2026
    │   ├── Location: Overland Park Soccer Complex
    │   ├── Divisions: U10, U12, U14, U16
    │   ├── Max teams per division: 16
    │   ├── Registration fee: $450/team
    │   ├── Registration opens: June 1
    │   ├── Registration closes: July 10
    │   ├── Roster lock: July 15
    │   └── Format: Pool play (4 pools of 4) → single elimination
    │
    ├── Division rules:
    │   ├── U10: born on/after Jan 1, 2016
    │   ├── U12: born on/after Jan 1, 2014
    │   ├── U14: born on/after Jan 1, 2012
    │   └── U16: born on/after Jan 1, 2010
    │
    ├── Requirements:
    │   ├── All players must be age-verified on Go Participate
    │   ├── Waiver must be signed by parent/guardian
    │   ├── Coach must have SafeSport certification
    │   └── Min 7 players, max 15 per roster
    │
    └── Publish → event visible on Go Participate event discovery
```

### Team Registers for Event

```
KC Thunder org admin sees "Summer Showdown 2026" on GP
    │
    ▼
Step 1: Select division
    ├── U12 (12 of 16 spots remaining)
    │
    ▼
Step 2: Select team
    ├── KC Thunder U12 (15 players on roster)
    │
    ▼
Step 3: Build event roster
    ├── System shows all U12 players with status:
    │
    │   ✅ Tommy Smith      — Verified, medical ✅, waiver ✅
    │   ✅ Jake Wilson       — Verified, medical ✅, waiver ✅
    │   ✅ Maria Garcia      — Verified, medical ✅, waiver ✅
    │   ⚠️  Chris Brown      — Verified, medical ✅, waiver MISSING
    │   ⚠️  Alex Johnson     — Verification EXPIRED
    │   ❌ Ryan Davis        — Born 12/15/2013 → NOT eligible for U12
    │   ...
    │
    ├── Coach selects 12 eligible players
    ├── System auto-notifies parents of players with issues:
    │   ├── Chris's parent → "Sign waiver for Summer Showdown"
    │   └── Alex's parent → "Re-upload birth certificate"
    │
    ▼
Step 4: Confirm coach credentials
    ├── System checks head coach SafeSport cert
    ├── ✅ Valid through Dec 2026
    │
    ▼
Step 5: Payment
    ├── Registration fee: $450
    ├── Pay via Stripe (card on file or new card)
    ├── Receipt sent to org admin email
    │
    ▼
Step 6: Confirmation
    ├── Team registered for Summer Showdown U12
    ├── Added to event schedule
    ├── Parents notified: "KC Thunder U12 registered for Summer Showdown"
    ├── Roster editable until roster lock date (July 15)
    └── Event appears on all players' family calendars
```

### Tournament Day

```
LEAGUE ADMIN (event day)
    │
    ├── Check-in teams at venue
    │   └── Digital check-in: scan team QR or tap confirm
    ├── Verify rosters (system already validated)
    ├── Seed pools or confirm pre-set pools
    ├── Set field assignments
    ├── Manage schedule changes (weather, delays)
    │
    ▼
DURING GAMES
    │
    ├── Score entry (league staff or coaches)
    │   ├── Final score per game
    │   ├── Optional: detailed stats
    │   └── Real-time bracket/standings update
    │
    ├── Parents see live:
    │   ├── Scores on family dashboard
    │   ├── Bracket progression
    │   └── Next game time/field
    │
    ▼
POST-TOURNAMENT
    │
    ├── Final standings published
    ├── All-tournament team selections (optional)
    ├── Stats aggregated to player profiles
    ├── Your Prep Sports auto-generates:
    │   ├── Results article
    │   ├── Bracket visual
    │   └── Stat leaders
    └── Parent notification: "Tournament complete — view results"
```

---

## Flow 4: Uniform Partner Order

```
SETUP (one time per team/season)
─────────────────────────────────
Org admin enables Partner Tier for KC Thunder
    │
    ├── Views uniform partner catalog
    ├── Selects package (jerseys + shorts, or full kit)
    ├── Chooses team colors, uploads logo
    ├── Sets customization options (name on back? number choice?)
    │
    ▼
Coach initiates "Uniform Order" for KC Thunder U12
    │
    ▼
SIZE COLLECTION (automated)
────────────────────────────
System sends push notification to all parents on roster:
    "KC Thunder U12 needs uniform sizes for [player name]"
    │
    Parent opens notification → size selection screen:
    │
    ├── Jersey size: YS / YM / YL / AS / AM / AL
    ├── Shorts size: YS / YM / YL / AS / AM / AL
    ├── Jersey number preference: [dropdown, conflicts shown]
    ├── Optional add-ons:
    │   ├── Warm-up jacket — $XX (team discount applied)
    │   ├── Practice jersey — $XX
    │   └── Bag — $XX
    ├── Submit
    │
    ▼
COACH DASHBOARD (real-time)
────────────────────────────
Coach sees:
    ├── 10/15 sizes submitted
    ├── 5 outstanding:
    │   ├── Chris Brown — no response (reminded 2x)
    │   ├── Alex Johnson — no response
    │   ├── ...
    │
    ├── "Send Reminder" button → pushes notification again
    ├── "Submit Order" button → active when all sizes collected
    │
    ▼
ORDER SUBMISSION
────────────────
Coach clicks "Submit Order"
    │
    ├── Order summary shown with all sizes, numbers, add-ons
    ├── Team discount applied (Partner Tier pricing)
    ├── Payment: charged to org account OR split to individual families
    ├── Confirmation sent to coach + all parents
    │
    ▼
FULFILLMENT
───────────
    ├── Partner receives order via API/webhook
    ├── Status updates flow back to Go Participate:
    │   ├── Order received
    │   ├── In production
    │   ├── Shipped (with tracking)
    │   └── Delivered
    ├── Parents see status on family dashboard
    └── Ships to coach (bulk) or individual addresses
```

---

## Flow 5: Coach Game Day (7v7 Football)

```
PRE-GAME (30 min before)
─────────────────────────
Coach opens Go Participate → Game Day mode
    │
    ├── Today's game: KC Thunder U12 vs STL Elite U12
    ├── Pool Play Game 2 — Summer Showdown
    ├── Field 4, 10:00 AM
    │
    ▼
ATTENDANCE
    ├── System shows roster, pulls from RSVP data
    ├── Coach marks who's actually present: 11 of 12
    ├── Jake is absent (parent marked "not coming" last night)
    │
    ▼
LINEUP (mobile-optimized)
    ├── Drag-and-drop or tap-to-assign positions
    ├── 7 starters: QB, C, WR, WR, WR, CB, S
    ├── 4 subs ready to rotate
    ├── AI suggestion (if enabled):
    │   "Based on last game, consider starting Marcus at Safety —
    │    he had 2 INTs against similar offense"
    │
    ▼
DURING GAME
    ├── Optional: tap-to-score (TD, PAT, INT, sack)
    ├── Sub tracking: tap player in, tap player out
    ├── Playing time tracker running per player
    │
    ▼
POST-GAME
    ├── Enter final score (or already tracked)
    ├── Quick stats entry (optional detail level)
    ├── Result auto-updates tournament bracket
    ├── Parents see result on family dashboard
    └── "Next game: 1:30 PM, Field 2 vs Dallas Prime"
```
