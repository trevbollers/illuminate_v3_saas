# Public Pages Testing

> No login required — test as anonymous user

## Platform Pages (goparticipate.com)
- [ ] View homepage — features, pricing, sign-in dropdown
- [ ] View programs listing (`/programs`)
- [ ] Filter programs by sport
- [ ] Filter programs by type (camp, tryout, tournament)
- [ ] Verify all tenant programs appear
- [ ] Verify all league events appear

## Tenant Public Pages
- [ ] View MidAmerica 7v7 (`/midamerica-7v7`) — events listed
- [ ] View KC Thunder (`/kc-thunder`) — teams, programs, shop
- [ ] View Court 45 Basketball (`/court-45-basketball`) — teams, tryout program
- [ ] View Minnesota Heat (`/minnesota-heat`) — team listed

## Program Registration (Public)
- [ ] Click "Register Now" on a tryout program
- [ ] Fill registration form (email, phone required)
- [ ] Submit for free program → verify check-in code shown
- [ ] Submit for paid program → verify Stripe redirect
- [ ] Complete payment → verify confirmation email + SMS
- [ ] Verify check-in code in email

## League Public Events
- [ ] View event detail page (schedule, standings, teams tabs)
- [ ] Switch between divisions
- [ ] View teams by division
- [ ] View schedule by day
- [ ] View standings table
- [ ] View brackets (if published)

## Sign-In Routing
- [ ] Click Sign In → dropdown shows League / Team / Family options
- [ ] League option → redirects to localhost:4002
- [ ] Team option → redirects to localhost:4003
- [ ] Family option → redirects to localhost:4003/login
- [ ] Get Started → signup page with role selection
