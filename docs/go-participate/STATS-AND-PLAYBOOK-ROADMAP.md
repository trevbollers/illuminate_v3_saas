# Stats & Playbook Builder — Future Roadmap

## Priority Order
1. **Playbook Builder** (build first — coaches need this before stats)
2. **Stats Entry & Tracking** (build second — ties into game flow)

---

## 1. Playbook Builder

### Overview
Visual playbook creation tool for coaches to design, organize, and share plays with their team. Sport-specific field/court templates with drag-and-drop player positioning and route drawing.

### Sports Supported
- **7v7 Football** — half-field template, 7 offensive/defensive positions, route trees
- **Flag Football** — similar to 7v7 with flag-specific rules (no blocking, rush rules)
- **Basketball** — full/half court, 5 positions, motion/set plays, zone vs man diagrams

### Features to Scope

**Play Designer:**
- Sport-specific field/court background (SVG templates)
- Drag-and-drop player icons with position labels (QB, WR1, WR2, etc.)
- Route drawing — lines, curves, arrows (passing routes, cuts, screens)
- Color-coded routes by assignment
- Play name, formation name, play type (offense/defense/special)
- Tags for organization (red zone, goal line, 2-point, press break, etc.)
- Notes per play (coaching points, reads, audibles)

**Playbook Organization:**
- Folders/categories: Offense, Defense, Special Teams
- Play ordering within categories
- Duplicate/variant plays (same formation, different route combos)
- Game plan builder — select plays for a specific game/opponent

**Sharing & Access:**
- Share playbook with team (players see their assignments only vs full play)
- Export to PDF for printing
- Present mode — fullscreen play-by-play for team meetings
- Role-based: coaches see all, players see their position highlighted

**Data Model:**
```
Playbook (org DB):
  - teamId
  - sport
  - name ("2026 Spring Offense")
  - plays: [Play]

Play:
  - name ("Trips Right Slant")
  - formation ("Trips Right")
  - type ("offense" | "defense" | "special")
  - tags: string[]
  - positions: [{ id, label, x, y }]
  - routes: [{ fromId, points: [{x,y}], type: "run"|"pass"|"block"|"cut", color }]
  - notes: string
  - createdBy
```

**Tech Considerations:**
- Canvas-based or SVG-based play designer
- Touch-friendly for iPad/tablet use (coaches draw on tablets at practice)
- Consider using a library like Konva.js (React canvas) or plain SVG with drag handlers
- Offline-capable (coaches at practice may not have wifi)

### Upsell Potential
- Free: 5 plays
- Team Pro: Unlimited plays
- AI Coach add-on: AI suggests plays based on opponent tendencies, player strengths

---

## 2. Stats Entry & Tracking

### Overview
Per-player game statistics entry, aggregation, and display. Coaches enter stats during or after games. Parents view their child's stats. League admins see event-wide stat leaders.

### Stat Model (already exists)
```typescript
// packages/db/src/models/org/stat.ts
IStat {
  gameId: ObjectId      // linked to specific game
  teamId: ObjectId      // which team
  playerId: ObjectId    // which player
  playerName: string
  sport: string
  data: Record<string, number>  // flexible key-value stats
  enteredBy: ObjectId
}
```

### Sport-Specific Stat Fields

**7v7 Football:**
| Stat | Key | Description |
|------|-----|-------------|
| Touchdowns | `td` | Offensive touchdowns scored |
| Interceptions | `int` | Defensive interceptions |
| Interceptions Thrown | `int_thrown` | QB interceptions thrown |
| Receptions | `rec` | Passes caught |
| Receiving Yards | `rec_yds` | Yards after catch |
| Passing Yards | `pass_yds` | Yards thrown |
| Completions | `comp` | Completed passes |
| Attempts | `att` | Pass attempts |
| Rushing Yards | `rush_yds` | Yards on designed runs (if allowed) |
| Sacks | `sack` | QB sacks |
| Pass Breakups | `pbu` | Passes defended |
| Flags Pulled | `flags` | Defensive flags pulled |

**Basketball:**
| Stat | Key | Description |
|------|-----|-------------|
| Points | `pts` | Total points scored |
| 2PT Made | `fg2m` | Two-pointers made |
| 2PT Attempted | `fg2a` | Two-pointers attempted |
| 3PT Made | `fg3m` | Three-pointers made |
| 3PT Attempted | `fg3a` | Three-pointers attempted |
| FT Made | `ftm` | Free throws made |
| FT Attempted | `fta` | Free throws attempted |
| Rebounds | `reb` | Total rebounds |
| Offensive Rebounds | `oreb` | Offensive boards |
| Assists | `ast` | Assists |
| Steals | `stl` | Steals |
| Blocks | `blk` | Blocks |
| Turnovers | `tov` | Turnovers |
| Fouls | `pf` | Personal fouls |
| Minutes | `min` | Minutes played |

### Features to Scope

**Stats Entry Page (`/stats/enter`):**
- Select game from schedule
- Roster auto-loaded for that team
- Grid: players down the side, stat columns across
- Quick-tap buttons for common stats (basketball: +2, +3, +FT)
- Mobile-first — coaches enter on phones at games
- Auto-save / draft mode
- Timer integration (game clock for basketball minutes tracking)

**Stats Dashboard (`/stats`):**
- Season averages per player
- Game-by-game breakdown
- Team totals
- Leaderboards (top scorer, most assists, etc.)
- Visual charts (bar charts for scoring, line charts for trends)

**Parent View:**
- See their child's stats only
- Season averages, game log
- Share-friendly (screenshot-ready cards)

**League-Level Stats (`apps/league`):**
- Event stat leaders across all teams
- Division MVP voting (future)
- All-tournament team selection

**API Endpoints Needed:**
- `POST /api/stats` — enter stats for a game
- `GET /api/stats?gameId=xxx` — get stats for a game
- `GET /api/stats?playerId=xxx` — get all stats for a player
- `GET /api/stats/leaders?teamId=xxx` — team leaderboard
- `GET /api/stats/season?teamId=xxx` — season averages

### Upsell Potential
- Free: Basic stat entry (points/touchdowns only)
- Team Pro: Full stat tracking, charts, trends
- AI Scout add-on: AI-generated player evaluation reports, development tracking

---

## Dependencies
- Stats depends on: Games existing in the schedule (done), Roster (done)
- Playbook depends on: Teams (done), Roster for player positions (done)
- Neither blocks launch — both are growth features

## Recommended Build Order
1. Playbook MVP (basic play designer with SVG field templates)
2. Stats entry (mobile-first quick entry)
3. Stats dashboard (aggregation + charts)
4. Playbook sharing + game plans
5. League-level stat leaders
6. AI Coach integration (play suggestions)
7. AI Scout integration (player evaluations)
