# End-to-End Test Scenario

> This scenario walks through a complete tournament lifecycle with multiple orgs and families.

## Setup — League Creates Tournament

- [ ] League admin creates "Summer Showdown 2026" tournament
- [ ] Add divisions: 12U, 14U, 16U, 18U
- [ ] Set registration_open
- [ ] Verify event visible on `goparticipate.com/midamerica-7v7`
- [ ] Verify event visible on `goparticipate.com/programs`

## Org 1 — KC Thunder

- [ ] Coach creates 14U team
- [ ] Import roster from CSV (10 players with parent emails)
- [ ] Verify parent invites sent
- [ ] Register 14U team for Summer Showdown
- [ ] Complete Stripe payment for registration
- [ ] Verify registration appears in league admin

## Org 2 — Court 45 Basketball (cross-sport org)

- [ ] Coach creates 14U 7v7 team (basketball org adding football)
- [ ] Import roster from XLS
- [ ] Register team for Summer Showdown 14U
- [ ] Pay registration fee

## Org 3 — Minnesota Heat

- [ ] Girls Flag team already exists with 10 players
- [ ] Register for Summer Showdown (appropriate division)
- [ ] Pay registration fee

## Org 4 — New Org (fresh signup)

- [ ] Sign up on goparticipate.com as new org
- [ ] Create first team
- [ ] Import roster
- [ ] Register for Summer Showdown
- [ ] Pay registration fee

## Families Join and Verify

- [ ] Parent 1 signs up as family on goparticipate.com
- [ ] Accepts KC Thunder invite
- [ ] Adds child to family DB
- [ ] Uploads birth certificate
- [ ] Player shows as "verified" on family dashboard

- [ ] Parent 2 accepts Court 45 invite
- [ ] Already has family DB from previous signup
- [ ] Adds second child (sibling on different team)
- [ ] Uploads birth cert for second child

- [ ] Parent 3 accepts Minnesota Heat invite
- [ ] Registers child for Court 45 tryouts (cross-org)

## League Processes Registrations

- [ ] League admin views all 4+ registrations
- [ ] Approves all registrations
- [ ] Checks player verification status per team
- [ ] Verifies any unverified players via document grants

## League Generates Schedule & Brackets

- [ ] Generate AI schedule for all divisions
- [ ] Publish schedule
- [ ] Verify public schedule visible at `/public/events/summer-showdown-2026`
- [ ] Define bracket tiers per division
- [ ] Generate bracket shells

## Event Day — Check-In

- [ ] Parents show QR check-in codes at entrance
- [ ] Staff scans codes → player info + payment confirmed
- [ ] Mark players as checked in
- [ ] Verify already-checked-in rejected on re-scan
- [ ] Verify unpaid registration rejected

## Tournament Play

- [ ] Enter scores for pool play games
- [ ] Recalculate standings
- [ ] Verify tiebreaker rules applied correctly
- [ ] Seed brackets from standings
- [ ] Enter bracket game scores
- [ ] Verify winners auto-advance
- [ ] Complete tournament through championship

## Post-Event

- [ ] Verify standings visible on public page
- [ ] Verify brackets show completed results
- [ ] Parents view results on family dashboard schedule
- [ ] League sends post-event announcement to all orgs
