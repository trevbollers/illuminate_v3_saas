# Go Participate — Beta Test Checklist

A practical walk-through for beta testers. Organized by the role you're playing, not by feature area — so you can hand one section to each tester.

## Before any testing can happen

These are blockers on the server itself. None of the auth/email/payment tests work until these are in place.

- [ ] Real API keys filled into `/opt/go-participate/.env.production`:
  - [ ] `RESEND_API_KEY` (emails) — without this, no invites or magic codes send
  - [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` — without these, no payments
  - [ ] `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` — without these, no SMS invites
  - [ ] `ANTHROPIC_API_KEY` — for AI features (CSV import, schedule generation, coach features)
  - [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — for Google OAuth signup (optional if magic codes work)
- [ ] After editing `.env.production` on the server, run: `docker compose -f /opt/go-participate/docker-compose.prod.yml up -d --force-recreate`
- [ ] Seed a platform admin account so there's someone with `gp_admin` role to manage tenants
- [ ] Verify all 5 subdomains load cleanly in a browser (no 502s)

---

## Test accounts to create up front

Create these before handing anything to external testers. Use real emails you can check — auth flows rely on email delivery working.

| Role | Email | Notes |
|---|---|---|
| Platform admin | admin@goparticipate.com | You. Seeded via `scripts/seed-platform-admin.sh` — only role not self-serviceable. |
| League owner | league-tester@example.com | Tests `<league>.gameon.goparticipate.com`. Creates their own test league via signup. |
| Org owner | org-tester@example.com | Tests `<org>.gameon.goparticipate.com`. Creates their own test org via signup. |
| Head coach | coach-tester@example.com | Invited by org owner |
| Assistant coach | assistant-tester@example.com | Invited by head coach |
| Parent / family | parent-tester@example.com | Invited to watch a child |
| Player | (uses parent's or own email) | — |

### Reserved tenant slugs — do not use for test tenants

These are reserved for the real launch. If any tester tries to claim one, reject/rename:

- `midamerica7v7` — launch league tenant (MidAmerica 7v7)
- `goparticipate` — platform itself
- `yourprepsports` — media brand
- `www`, `api`, `admin`, `app`, `auth`, `billing`, `docs`, `help`, `mail`, `status`, `support` — subdomain reserved list (already blocked in code)

**For test leagues and orgs, use obviously-fake names.** E.g.:
- `test-league-alpha`, `demo-basketball-league`, `qa-football-tournament`
- `test-org-thunder`, `demo-youth-sports`, `qa-team-manager`

The point is: anything a real customer might plausibly claim must not be squatted on by a test account.

---

## Role 1 — Platform admin (Go Participate staff)

**URL**: `https://admin.gameon.goparticipate.com`
**You should see**: every tenant, every plan, platform-wide config.

### Auth
- [ ] Log in with platform-admin email. Magic code arrives in inbox within 60 seconds.
- [ ] Log out, log back in — session persists correctly.

### Tenant management
- [ ] List of all leagues and orgs loads.
- [ ] Click a tenant — see its settings, members, usage.
- [ ] Suspend a tenant → that tenant's users can no longer log in.
- [ ] Un-suspend — access restored.
- [ ] "Impersonate" / "view as" a tenant — you can load their app without their credentials. (If supported.)

### Plans & feature flags
- [ ] See the list of all plan tiers (Free, Team Pro, Partner, Org, League, AI add-ons).
- [ ] Edit a plan's price or limits — change persists after refresh.
- [ ] Toggle a feature flag — change takes effect immediately for matching tenants.

### Revenue / analytics
- [ ] Dashboard shows MRR, active tenants, churn.
- [ ] Numbers match what's in Stripe.

---

## Role 2 — League admin

**URL**: `https://<your-league-slug>.gameon.goparticipate.com`
**Plan**: League tier ($79.99/mo)
**What it's for**: running a 7v7 football or basketball tournament.

### Signup & onboarding
- [ ] From the marketing site, click "Start a League" → signup flow.
- [ ] Choose League tier, enter payment. Stripe checkout works.
- [ ] Pick a league subdomain that's not reserved.
- [ ] Redirected to `<slug>.gameon.goparticipate.com` after signup.
- [ ] Onboarding wizard walks through: league name, sport, region, logo, contact info.

### Event setup
- [ ] Create a new event (tournament or league season).
- [ ] Add multiple divisions (U10, U12, U14, etc.).
- [ ] Set age cutoff + birth year rules per division.
- [ ] Configure pricing: per-team fee, early-bird discount, late fee, multi-team discount.
- [ ] Upload event banner image (webp accepted, compresses on upload).
- [ ] Set event dates + locations + fields.

### Compliance setup
- [ ] Define required documents (birth certificate, medical release, waiver) per division.
- [ ] Upload a custom waiver PDF — all registering teams see it.
- [ ] Set coach certification requirements.

### Registration management
- [ ] Publish event — public page at `/events/<slug>` is live.
- [ ] External org submits a registration → it appears in "Pending" queue.
- [ ] Approve a registration → org sees status change.
- [ ] Reject with reason → org gets rejection notification email.
- [ ] Check that pending/approved/rejected counts update in real time.

### Verification review
- [ ] Family uploads a birth certificate → it appears in verification queue (encrypted).
- [ ] Decrypt + review (only possible with valid document grant from family).
- [ ] Approve / reject verification → family sees decision.
- [ ] Verify that the document itself is NEVER copied into the league DB — only the decision.

### Brackets & scheduling
- [ ] Auto-generate brackets from approved teams.
- [ ] Drag-and-drop a team between seeds.
- [ ] Generate schedule via AI (requires ANTHROPIC_API_KEY).
- [ ] Manually drag a game between field/time-slot cells.
- [ ] Bump conflict detection: try to drop a game on an occupied slot — see bump dialog.
- [ ] Team conflict detection: try to schedule same team in two places at once — get blocked.

### Day-of operations
- [ ] Check-in screen loads on phone/tablet.
- [ ] Scan a player QR code → check-in recorded, player marked eligible.
- [ ] Scan a QR for an unverified/ineligible player → check-in rejected with reason.
- [ ] Score entry: type home + away scores → standings auto-recalculate.
- [ ] Mark a championship game complete → winner flagged as champion on registration.

### Announcements
- [ ] Send a league announcement → all affiliated org admins get it.
- [ ] Announcement visible in org admin's dashboard with read/unread state.

### Public event page
- [ ] Loads at `/public/events/<slug>` without login.
- [ ] Shows divisions, schedule, brackets, standings, scores.
- [ ] Updates within a minute after score changes (cache behavior).
- [ ] Shares well to social (og:image preview).
- [ ] Mobile: all of the above works on iOS Safari and Android Chrome.

---

## Role 3 — Organization / team owner

**URL**: `https://<your-org-slug>.gameon.goparticipate.com`
**Plan**: Free / Team Pro / Partner / Organization tier.

### Signup & plan selection
- [ ] Signup as an org owner from the marketing site.
- [ ] Choose a plan tier — gated features match tier (e.g. Free limits to 1 team / 15 players).
- [ ] Stripe checkout completes, subscription shows as active.
- [ ] Onboarding: org name, sport, city/state, logo, uniform partner (if applicable).

### Team management
- [ ] Create a team.
- [ ] Free tier: creating a second team is blocked with upgrade prompt.
- [ ] Pro/Org tier: multiple teams allowed.
- [ ] Edit team — name, division, season, colors, socials.
- [ ] Archive (soft-delete) a team — disappears from active list but not permanently gone.

### Staff invites
- [ ] Invite a head coach by email → email arrives, contains accept link.
- [ ] Invite a head coach by SMS → text arrives with accept link.
- [ ] Invite the same person as head coach on multiple teams → single invite with teamIds array (they accept once).
- [ ] Remind a pending invite → resend fires.
- [ ] Revoke a pending invite → link no longer works.

### Roster building
- [ ] Add a player manually (first/last/DOB).
- [ ] Import roster via CSV upload → AI maps columns (no rigid template needed).
- [ ] CSV with non-standard headers ("DOB" vs "birthdate" vs "Date of Birth") — AI figures it out.
- [ ] Malformed CSV (missing required fields) — clear error, no partial import.
- [ ] Bulk-invite all imported players' parents by email.
- [ ] Player appears in multiple teams' rosters (multi-team athlete).

### Registration & payments
- [ ] Browse league events open for registration.
- [ ] Submit a registration for a specific division.
- [ ] Pay via Stripe — card captured, payment succeeds.
- [ ] Multi-team registration: register 3 teams in one checkout, multi-team discount applied.
- [ ] Refund flow: league admin refunds → amount returns to card, transaction logged.

### Day-to-day
- [ ] Create a team practice event → shows on team calendar.
- [ ] Recurring practice: every Tuesday + Thursday for 12 weeks.
- [ ] Notify parents on event creation → email + SMS go out.
- [ ] Take attendance at a practice — mark present/late/absent/excused per player.
- [ ] Send a team message → parents get it in-app + email + SMS (per their prefs).

### Storefront (paid tiers)
- [ ] Set up storefront at `<org-slug>.gameon.goparticipate.com/store`.
- [ ] Add a product (fan gear, dues) with pricing, image, sizes.
- [ ] Public customer browses and buys → Stripe checkout works.
- [ ] Order shows up in org admin's view with fulfillment status.

---

## Role 4 — Head coach

**URL**: `https://<org-slug>.gameon.goparticipate.com`
**How you got here**: accepted an invite from the org owner.

### Accepting invite
- [ ] Click accept link from email → land on accept page.
- [ ] If not logged in → prompted to sign in or create account first.
- [ ] After auth → membership granted for the invited team(s).
- [ ] Expired invite → clean error message, not a crash.

### Coach profile
- [ ] Fill out profile: photo, bio, experience, certifications, socials.
- [ ] Badges display on team dashboard (paid plan gate — Free doesn't show coaches).
- [ ] Update photo → new image appears everywhere.

### Team management (same as org admin, scoped to your team)
- [ ] See only your team(s), not the whole org.
- [ ] Build roster, invite players.
- [ ] Create practices, games, scrimmages.
- [ ] Send team messages.
- [ ] Submit league registrations for your team.

### Game day
- [ ] View the league's event page → see your team's schedule.
- [ ] QR codes for all your rostered players available for printing.
- [ ] Depth chart / lineup card printable view.

---

## Role 5 — Assistant coach / team manager

Same dashboard as head coach, limited permissions per role.

- [ ] Accept invite. View team, roster, schedule.
- [ ] **Assistant coach**: can mark attendance, send messages. Cannot delete team, cannot register for events.
- [ ] **Team manager**: can process payments + communicate, cannot edit roster beyond contact info.
- [ ] Permission denied actions show a clean error, not a crash.
- [ ] Org owner can adjust per-role custom permissions — changes apply to existing staff immediately.

---

## Role 6 — Family / parent

**URL**: `https://<org-slug>.gameon.goparticipate.com` (lands on family view), or `https://goparticipate.com/family` for cross-org family dashboard.

### First-time onboarding
- [ ] Invited by a coach → accept invite → prompted to confirm kid's info or add children.
- [ ] Self-signup (no invite) → create account, then link to a team via code or invite.
- [ ] Auto-created family DB — profile, guardian, player records created automatically.

### Family dashboard
- [ ] See all your children, across multiple teams, multiple orgs.
- [ ] Each child's upcoming schedule.
- [ ] RSVP for a game → coach sees response.
- [ ] Upload player photo → crops + saves + visible on roster.

### Document vault
- [ ] Upload birth certificate (encrypted client-side).
- [ ] Upload medical release PDF.
- [ ] Documents show in vault with "Encrypted" indicator.
- [ ] Grant one-time access to a league that's requesting it → time-limited key.
- [ ] Revoke a grant — league can no longer view.
- [ ] Confirm document URL isn't accessible without a valid grant (paste URL in incognito → denied).
- [ ] Family DB is isolated — another family cannot see your documents or children.

### Payments
- [ ] Dues invoice arrives → pay via Stripe.
- [ ] Installment plan available (season dues split into 3) → all 3 charge on schedule.
- [ ] Receipt emailed.
- [ ] View payment history — all transactions visible.

### Messaging
- [ ] Coach sends team message → arrives via email + SMS (per preferences).
- [ ] Urgent SMS (practice canceled 30 min before) → only opted-in numbers receive.
- [ ] Reply to message → coach sees it.
- [ ] Mute a specific team's notifications for 24h.

---

## Role 7 — Player

Typically uses their parent's account; older players may have their own.

- [ ] Magic code login with own email.
- [ ] See only own schedule.
- [ ] RSVP for own events.
- [ ] QR check-in at game → accepted.
- [ ] If check-in rejected (unpaid, not verified) → clear reason shown.
- [ ] View personal stats (if enabled — AI Scout plan).

---

## Role 8 — Public visitor (no login)

**URL**: `https://gameon.goparticipate.com`

### Marketing site
- [ ] Landing page loads < 2s on 4G.
- [ ] Pricing page accurate — all 7 tiers + add-ons.
- [ ] Feature pages render.
- [ ] Mobile menu works.
- [ ] Contact form submits, email arrives.

### Signup flow
- [ ] "Start a League" / "Start an Org" CTAs route correctly.
- [ ] Post-signup redirect lands on the correct subdomain.
- [ ] Welcome banner appears on first visit to new tenant dashboard.

### Public league event pages
- [ ] `/events/<slug>` loads without auth.
- [ ] Schedule, brackets, standings all visible.
- [ ] Live score updates during game day.
- [ ] Social sharing preview has event poster.

### Org storefronts
- [ ] `/store` on org subdomain loads without auth.
- [ ] Products browsable.
- [ ] Guest checkout works (don't require account for fan gear).
- [ ] Order confirmation email arrives.

### Public registration
- [ ] "Play with us" flow on league public event → submit team + get confirmation.
- [ ] "Played with us before" → sign in with existing org account, pre-fill team info.

---

## Cross-cutting tests (everyone should verify)

### Multi-tenant isolation
- [ ] Log in as org A → URL-poke an org B's data → **denied with 403/404**.
- [ ] Same for leagues, families.
- [ ] No tenant's data appears in another tenant's queries.

### Devices & browsers
- [ ] Desktop Chrome, Safari, Firefox, Edge.
- [ ] iOS Safari 16+ (iPhone).
- [ ] Android Chrome (real phone, not just devtools emulation).
- [ ] iPad landscape + portrait.
- [ ] Small Android tablet.

### Network conditions
- [ ] Slow 3G simulated → app still usable, just slower.
- [ ] Offline → graceful fail state, not blank white page.
- [ ] Intermittent connectivity (common at fields) → retries work.

### Accessibility
- [ ] Keyboard navigation through signup + core flows.
- [ ] Screen reader (VoiceOver on Mac, TalkBack on Android) reads labels correctly.
- [ ] Color contrast passes on key CTAs and badges.
- [ ] Focus outlines visible when tabbing.

### Security
- [ ] Login rate-limited (no brute force).
- [ ] Password reset token single-use and expires in 1 hour.
- [ ] Magic code single-use and expires in 10 minutes.
- [ ] Session cookie `HttpOnly` + `Secure` + `SameSite`.
- [ ] Uploaded docs not accessible by direct URL without grant.
- [ ] Can't enumerate tenants by trying slugs (or if you can, it leaks no data).

---

## Known limitations (tell testers up front)

- Beta is running on a single Hetzner CX11 — **may be slow under load**.
- Uploaded files currently go to the server's local disk, not S3 — **don't upload anything you can't afford to lose**.
- Only 5 fixed subdomains route for now (`gameon`, `admin`, `league`, `dash`, `store`). **Wildcard tenant subdomains aren't wired yet** — if you sign up and don't see your tenant's URL work, that's why.
- Venmo payments aren't available yet — Stripe cards only.
- Some type-debt was suppressed during the initial ship — expect occasional runtime oddities; **report them.**

---

## Bug report template

Hand this to every tester.

```
## What happened
(1-2 sentences)

## What should have happened
(1-2 sentences)

## Steps to reproduce
1.
2.
3.

## URL / app / role
Role: (e.g. "head coach")
URL: https://...
Device/browser:

## Screenshots / screen recording
(attach)

## Account / tenant for debugging
Account email:
Tenant slug:
Approximate time (your timezone + UTC):
```

Testers should submit via: (pick one — Linear, GitHub issues, a shared Google doc, an `issues@goparticipate.com` email box, etc.)

---

## What's NOT in scope for beta

- AI Coach / AI Scout add-ons (stubbed, not shippable yet)
- Custom domain support for tenants (tenants must use `<slug>.gameon.goparticipate.com`)
- Stats & development tracking beyond MVP
- Uniform ordering integration with suppliers
- Venmo / PayPal checkout

---

## Beta success criteria

We're ready to launch when:

- [ ] Zero 500 errors observed in a week of daily use by 3+ testers per role
- [ ] At least one full tournament run end-to-end (registration → bracket → game day → standings published)
- [ ] At least one season of practices + games tracked by an org
- [ ] Payments processed cleanly across ≥20 transactions with no stuck states
- [ ] Email + SMS deliverability ≥98% (monitored via Resend + Twilio dashboards)
- [ ] Mobile Lighthouse score ≥80 on key pages
- [ ] No P0 bugs open
- [ ] Backup + restore drill completed successfully at least once
