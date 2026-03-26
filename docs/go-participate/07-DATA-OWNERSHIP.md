# 07 — Data Ownership, Privacy & Cross-Tenant Architecture

## Three-Layer SaaS Model

Go Participate is not a standard flat SaaS. It has a three-layer model where the end user
(family) is a platform citizen, not tenant property.

```
LAYER 1: PLATFORM (Go Participate)
  Role: SaaS operator, identity provider, document custodian
  Revenue: Subscription fees from Layer 2 tenants
  Owns: users, tenants, plans, feature_flags, sports, players, families, document_vault, document_grants

LAYER 2a: LEAGUE TENANTS (B2B customer of platform)
  Role: Event organizer, compliance authority, verification reviewer
  Revenue: Event registration fees from orgs/teams
  Owns: events, divisions, brackets, games, standings, compliance_rules, waivers,
        registrations, roster_snapshots, verification_reviews

LAYER 2b: ORG/TEAM TENANTS (B2B customer of platform)
  Role: Team manager, family-facing operations
  Revenue: Dues, fundraisers, uniform sales from families
  Owns: teams, rosters, org_events, attendance, messages, transactions,
        uniform_orders, invites, verification_services

LAYER 3: FAMILIES (Platform citizens — not owned by any tenant)
  Role: End user, data owner, document vault owner
  Money flows: Pays dues to orgs, event fees to leagues (via orgs), subscriptions to platform (future)
  Owns: Their player profiles, their documents, their access grants
  Key property: Families move between orgs and leagues freely
```

## Org vs Team: Same Tenant Type, Different Scale

An "organization" and a standalone "team" are both `tenantType: "organization"` with an
`org_<slug>` database. The difference is plan tier and team count.

```
Organization (KC Thunder)              Standalone Team (Johnson County Lions 10U)
  org_owner / org_admin                  org_owner (coach or parent)
  Multiple teams                         One team
  Org-level subscription ($29.99)        Team-level subscription ($9.99 or free)
  Same dashboard app                     Same dashboard app
  Multi-team view                        Single-team view (no team switcher)
```

Both use `apps/dashboard`. The UI adapts based on role and plan limits.

## Application Data Ownership

Each app is authoritative for the data it writes. Other apps read via cross-DB references.

| App | Writes to | Reads from |
|-----|-----------|------------|
| `apps/web` | Platform DB: `users` (registration) | `plans`, `tenants` |
| `apps/admin` | Platform DB: `tenants`, `plans`, `feature_flags`, `sports` | Everything (read-only oversight) |
| `apps/league` | League DB: all league collections | Platform DB: `players`, `document_vault` (via grants) |
| `apps/dashboard` | Org DB: all org collections | Platform DB: `players`, `families`; League DBs: `games`, `standings` |
| Family portal (future) | Platform DB: `players`, `families`, `document_vault`, `document_grants` | Org DBs: schedules, rosters; League DBs: schedules, stats |

## Database Ownership Map

### Platform DB (`goparticipate_platform`)

Owner: Platform (`apps/admin` + `apps/web`)

| Collection | Who writes | Who reads | Sensitivity |
|------------|-----------|-----------|-------------|
| `users` | Platform (registration, auth) | All apps (session/auth) | PII — email, name, password hash |
| `tenants` | Platform admin | All apps (tenant resolution) | Low |
| `plans` | Platform admin | Web (pricing), all apps (limit enforcement) | Low |
| `feature_flags` | Platform admin | All apps (feature gating) | Low |
| `sports` | Platform admin | Leagues (event config), orgs (team setup) | Low |
| `players` | Family (profile creation) | Orgs (rosters), leagues (registration) | PII — name, DOB, medical |
| `families` | Family / platform | Orgs (parent contact), families (portal) | PII — guardian info |
| `document_vault` | Family (encrypted upload) | Nobody without grant | ENCRYPTED — zero-knowledge |
| `document_grants` | Family (consent) | Granted tenants (time-limited) | Access control records |

### League DB (`league_<slug>`)

Owner: League tenant (`apps/league`)

| Collection | Description | Cross-tenant references |
|------------|-------------|------------------------|
| `events` | Tournaments, seasons, showcases | None |
| `divisions` | Age/grade divisions | References `sports` from platform DB |
| `registrations` | Team registrations for events | References `orgTenantId`, `teamId`, `playerIds` |
| `roster_snapshots` | Frozen roster at registration time | References `playerIds` from platform DB |
| `brackets` | Tournament structure | References `registrations` |
| `games` | Scored game records | References `teamId`, `playerIds` |
| `standings` | Computed W/L/T records | References `teamId` |
| `compliance_rules` | League-specific doc requirements | None |
| `waivers` | Signed waivers | References `playerId` from platform DB |
| `verification_reviews` | League's approval/rejection of docs | References `playerId`, `documentId` |

### Org DB (`org_<slug>`)

Owner: Org/team tenant (`apps/dashboard`)

| Collection | Description | Cross-tenant references |
|------------|-------------|------------------------|
| `teams` | Team definitions (canonical) | References `sport` from platform DB |
| `rosters` | Player-to-team assignments (live, mutable) | References `playerIds` from platform DB |
| `org_events` | Practices, scrimmages, meetings | None |
| `attendance` | Check-in / RSVP records | References `playerIds` |
| `messages` | Coach-parent communication | References `userIds` from platform DB |
| `transactions` | Dues, fees, refunds | References `familyId` |
| `uniform_orders` | Sizing, orders, shipping | References `playerIds` |
| `invites` | Pending team invitations | References `userIds` |
| `verification_services` | Optional fee-based doc handling | References `playerIds` |

## Cross-Tenant Data Flow Patterns

### Team Registers for a League Event

```
Org submits registration via API
  │
  ├── Platform DB: resolve playerIds, verify family grants exist
  │
  ├── League DB: create registration record
  │   { orgTenantId, teamId, playerIds[], eventId, status }
  │
  └── League DB: create roster_snapshot
      { registrationId, players: [{ playerId, name, jerseyNumber, position }] }
      Frozen at submission time for compliance audit
```

### Family Views Stats Across All Leagues

```
Family portal → Platform DB: get playerIds for this family
  │
  ├── For each league the player is registered in:
  │   └── League DB: query games/stats by playerId
  │
  └── Aggregate at API layer, return unified view
```

### League Reviews Verification Documents

```
League staff opens review queue
  │
  ├── Platform DB: check document_grants for this league + player
  │
  ├── If active grant exists:
  │   ├── Fetch encrypted blob from storage (S3)
  │   ├── Decrypt DEK using league's private key
  │   ├── Decrypt document in-memory (never written to disk)
  │   └── Stream to reviewer's browser over TLS
  │
  └── League DB: store verification_review (decision only, not the document)
      { playerId, documentType, status: "approved"|"rejected", reviewedBy, reviewedAt }
```

## Family Document Vault — Zero-Knowledge Encryption

### Principle

The platform is a **zero-knowledge document vault**. Even platform admins cannot read family
documents. Only the family (owner) and explicitly granted tenants (with time-limited keys)
can decrypt.

### Encryption Architecture

```
UPLOAD FLOW:
  1. Client generates per-document AES-256 key (DEK)
  2. Client encrypts file + metadata with DEK
  3. Client encrypts DEK with family's Key Encryption Key (KEK)
  4. Encrypted blob → cloud storage (S3)
  5. Encrypted DEK + integrity hashes → platform DB

GRANT FLOW:
  1. Family decrypts DEK with their KEK
  2. Family re-encrypts DEK with recipient tenant's public key
  3. Platform stores grant record with re-encrypted DEK + expiry
  4. Recipient can now decrypt the document using their private key

REVOKE FLOW:
  1. Family deletes or expires the grant record
  2. Recipient's re-encrypted DEK is deleted
  3. Recipient can no longer decrypt (even if they cached the encrypted blob)
```

### Key Hierarchy

```
Family KEK (Key Encryption Key)
├── Derived from family's password + salt (PBKDF2/Argon2)
├── OR stored in device keychain (mobile)
├── Backup: recovery key generated at signup (printed, never stored by platform)
└── Encrypts/decrypts per-document DEKs

Document DEK (Data Encryption Key)
├── Unique AES-256 key per document
├── Encrypted at rest with family's KEK
└── Re-encrypted with recipient's public key when access is granted

Tenant Keypair (per league/org)
├── RSA-2048 or X25519 keypair
├── Public key: stored in tenant record (platform DB)
├── Private key: encrypted with tenant admin's credentials (tenant DB)
└── Decrypts granted document DEKs
```

### Document Vault Schema

```
player.documentVault[] {
  documentId:    ObjectId
  type:          "birth_certificate" | "medical_clearance" | "proof_of_residency" |
                 "academic_standing" | "waiver" | "insurance" | "photo_id"
  storageKey:    string          // S3 path: "docs/v1/{familyId}/{documentId}.enc"
  encryptedDEK:  Buffer          // AES-256 key encrypted with family KEK
  contentHash:   string          // SHA-256 of original file bytes (integrity)
  metadataHash:  string          // SHA-256 of extracted PII (DOB, name — for verification matching)
  mimeType:      string          // "image/jpeg" | "application/pdf"
  fileSize:      number
  uploadedAt:    Date
  uploadedBy:    ObjectId        // userId (parent/guardian)
  // NO plaintext content. NO readable PII. NO thumbnails.
}
```

### Document Grants Schema

```
documentGrants {
  grantId:               ObjectId
  familyId:              ObjectId
  documentId:            ObjectId
  grantedTo: {
    tenantId:            ObjectId
    tenantType:          "league" | "organization"
  }
  recipientEncryptedDEK: Buffer     // DEK re-encrypted with recipient's public key
  purpose:               "league_registration" | "age_verification" | "medical_clearance" | ...
  expiresAt:             Date       // time-limited access
  revokedAt:             Date|null  // family can revoke anytime
  grantedBy:             ObjectId   // userId (parent/guardian who consented)
  grantedAt:             Date
}
```

### Integrity Hashes (What They Enable Without Decryption)

```
contentHash (SHA-256 of original file bytes):
  - Detect duplicate uploads
  - Prove document integrity (not tampered post-upload)
  - Allow league to confirm "same doc I reviewed" on re-check

metadataHash (SHA-256 of extracted PII):
  - Client extracts DOB/name before encryption
  - Hashes it: SHA-256("2014-03-15|John Smith")
  - Platform stores ONLY the hash
  - League can verify "does DOB on birth cert match claimed DOB?"
    by hashing the claimed value and comparing — without platform seeing the actual value
```

### Security Guarantees

| Actor | Cannot do |
|-------|-----------|
| Platform admin | Cannot read any document (zero-knowledge vault) |
| Platform DB breach | Encrypted blobs + encrypted DEKs — useless without family KEK |
| Storage (S3) breach | Encrypted blobs — useless without DEKs |
| League staff | Cannot persist/download docs (server-side streaming only, no caching) |
| Org admin | Cannot access docs unless family explicitly grants |
| Other families | Cannot see any other family's documents |

### Future: `packages/vault`

The encryption layer will be implemented as a dedicated package:

```
packages/vault/
├── src/
│   ├── keys.ts          # KEK derivation, keypair generation, key rotation
│   ├── encrypt.ts       # Client-side encryption helpers (DEK generation, AES-256)
│   ├── decrypt.ts       # Server-side decryption (in-memory streaming)
│   ├── grants.ts        # Grant/revoke logic, DEK re-encryption
│   ├── hashing.ts       # SHA-256 integrity and metadata hashing
│   ├── storage.ts       # S3 upload/download of encrypted blobs
│   └── index.ts
```

## Data Portability — People Come and Go

A core design principle: **families will join and leave the platform**. The data architecture
must support clean entry and exit.

### What a family takes when they leave:
- Their player profiles (exported as JSON/PDF)
- Their documents (decrypted with their KEK, downloaded)
- Their verification history (list of what was reviewed and when)
- Their payment history (receipts from orgs/leagues)

### What stays behind when a family leaves:
- Roster snapshots in league DBs (compliance/audit records — anonymized after retention period)
- Game stats (anonymized or attributed by jersey number only)
- Org attendance records (anonymized)
- Verification review decisions in league DBs (anonymized — "player was verified" without PII)

### What stays behind when an org leaves:
- Nothing in other tenant DBs (org data is fully isolated)
- Platform retains the tenant record (billing history, audit trail)
- League registration records reference the org by ID (can be marked "defunct org")

### What stays behind when a league leaves:
- Nothing in other tenant DBs (league data is fully isolated)
- Platform retains the tenant record
- Org references to league events become stale (can be marked "league no longer active")

## Feature Expansion Principle — Where New Data Goes

When adding new features, use this decision tree:

```
Is this data about a PERSON (player/family)?
  YES → Platform DB (players, families, document_vault)

Is this data about a LEAGUE's operations?
  YES → League DB (the league that owns the operation)

Is this data about an ORG's operations?
  YES → Org DB (the org that owns the operation)

Does this data cross tenant boundaries?
  YES → The PLATFORM brokers it:
    - Platform stores the reference/grant/consent
    - Each tenant stores their own view of the outcome
    - Example: registration (league stores registration, org submitted it,
      platform provided player identity)

Is this data a platform-wide configuration?
  YES → Platform DB (sports, plans, feature_flags)
```

### Examples of Where Future Features Land

| Feature | Where it lives | Why |
|---------|---------------|-----|
| AI practice plans | Org DB | Org-specific content generated for their team |
| AI player evaluations | Org DB | Org's internal assessment of their players |
| Live scoring | League DB | League operation during their event |
| Player highlight reels | Platform DB (media vault) | Player-owned content, shared like documents |
| Parent payment history | Org DB (`transactions`) | Financial data between family and specific org |
| Cross-league player rankings | Platform DB (computed) | Aggregated from multiple league DBs, player-centric |
| Uniform partner catalog | Platform DB | Platform-wide catalog, orgs select from it |
| Chat / messaging | Org DB (`messages`) | Org-scoped communication |
| League announcements | League DB | League-scoped communication |
| Referee assignments | League DB | League operation |
| Field/venue management | League DB or Org DB | Depends on who owns the venue |
| Sponsorship tracking | Tenant DB (league or org) | Sponsor relationship is with a specific tenant |
