# Organization / Team Admin Testing

> Repeat for each org: KC Thunder, Court 45 Basketball, Minnesota Heat
> Logins: `coach@kcthunder.com`, `coach@court45.com`, `coach@mnheat.com` → localhost:4003

## Teams
- [ ] Create a new team (name, sport, age group)
- [ ] Update team name, sport
- [ ] Upload team logo (verify webp conversion)
- [ ] Delete a team

## Roster
- [ ] Add a player manually to a team
- [ ] Update player jersey number, position
- [ ] Import roster via CSV/XLS upload
- [ ] Verify AI column mapping suggestions
- [ ] Adjust column mapping manually
- [ ] Preview import before confirming
- [ ] Confirm import — verify players created
- [ ] Verify duplicate player detection on re-import
- [ ] Verify parent invite sent on import (if email mapped)
- [ ] Remove a player from roster

## Programs
- [ ] Create a camp program (name, dates, fee, location, age groups)
- [ ] Create a tryout program
- [ ] Create a clinic program
- [ ] Update program details
- [ ] Set program status to registration_open
- [ ] Close registration on a program
- [ ] Delete a program
- [ ] Verify program appears on public page (`goparticipate.com/[slug]`)
- [ ] Verify program appears on platform listing (`goparticipate.com/programs`)

## Tryouts
- [ ] Create a tryout session from a tryout program
- [ ] Register a player for the tryout (via admin)
- [ ] Invite returning players via email/SMS
- [ ] Verify tryout number auto-assigned
- [ ] Record a voice evaluation (Web Speech API)
- [ ] Click AI Extract Scores — verify extraction
- [ ] Adjust scores manually and save evaluation
- [ ] View Players tab — verify avg scores
- [ ] View Decisions tab — assign player to a team
- [ ] Assign player as "not invited"
- [ ] Assign player to waitlist
- [ ] Verify invite created for assigned player

## Schedule
- [ ] Create a practice for one team
- [ ] Create a practice for multiple teams (tag selector)
- [ ] Create an org-wide meeting (All Teams checkbox)
- [ ] Create a recurring weekly event
- [ ] Update an event
- [ ] Cancel an event
- [ ] View calendar month view
- [ ] View daily list view

## League Registration
- [ ] Browse league events
- [ ] Add team to registration cart
- [ ] Complete Stripe checkout for registration
- [ ] Verify registration appears in league admin

## Attendance
- [ ] Open attendance for an event
- [ ] Mark players present/absent/late
- [ ] Bulk mark all present
- [ ] Verify RSVP shows for parent role

## Communication
- [ ] Send a team message
- [ ] Send a message with acknowledgement required
- [ ] View message delivery status
- [ ] View read tracking

## Orders & Storefront
- [ ] Create a product (fan gear)
- [ ] Update product price
- [ ] View orders list
- [ ] Update order fulfillment status

## Settings
- [ ] Update profile (name, phone)
- [ ] Update notification preferences
- [ ] Change password
