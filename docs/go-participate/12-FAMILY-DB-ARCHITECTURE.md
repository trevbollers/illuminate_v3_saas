# 12 — Family Database & Verification Vault Architecture

> Status: Architecture defined, not yet built
> Priority: Critical — core platform differentiator

## Overview

Each family gets their own isolated database (`family_<familyId>`) that serves as:
1. **Identity vault** — verified player identities with reusable verification records
2. **Document store** — encrypted documents (birth certs, medical forms) uploaded once
3. **Relationship hub** — tracks which orgs and leagues this family is connected to
4. **Parent dashboard data source** — one DB to query for the parent experience

## Why This Architecture

**Problem today**: Parents re-upload the same birth certificate every season to every
league. Each org stores PII in their own DB. When a family switches teams, their data
doesn't follow. Verification expires and restarts from scratch.

**Our solution**: Verify once, use forever. The family DB stores cryptographic proof
that verification happened. When a new league asks "is this player eligible?", the
platform answers from the verification record — no documents leave the vault, no
re-upload required.

## Database Structure

### Family DB: `family_<familyId>`

```
family_<familyId>/
├── family_profile          — Address, primary contacts, preferences
├── guardians               — Parent/guardian records with contact info
├── players                 — Player profiles (name, DOB, gender, sizing, photo)
├── verification_records    — Proof of verified identity (the permanent asset)
├── documents               — Encrypted document blobs (optional retention)
├── document_grants         — Time-limited access grants to orgs/leagues
├── connections             — orgTenantIds[], leagueTenantIds[]
└── activity_log            — Audit trail of who accessed what
```

### Verification Record (the key innovation)

```typescript
interface IVerificationRecord {
  playerId: ObjectId;
  playerName: string;
  dateOfBirth: Date;                    // Confirmed via document

  // Document proof (no actual document stored after verification)
  documentType: "birth_certificate" | "passport" | "school_id" | "medical_form";
  documentIdentifier: string;           // Certificate #, passport #, etc.
  documentIdentifierHash: string;       // SHA-256 hash for matching without exposing

  // Verification details
  verifiedAt: Date;
  verifiedBy: string;                   // Tenant slug of verifying org/league
  verifiedByUserId: ObjectId;           // Who reviewed it
  verificationMethod: "manual_review" | "ai_ocr" | "api_lookup";
  verificationHash: string;             // SHA-256(name + DOB + docId) — immutable proof

  // Status
  status: "verified" | "expired" | "revoked" | "disputed";
  expiresAt?: Date;                     // null for birth certs, annual for medical
  revokedAt?: Date;
  revokedReason?: string;

  // Reuse tracking
  usedBy: {                             // Every league/org that relied on this record
    tenantSlug: string;
    usedAt: Date;
    purpose: "age_verification" | "eligibility" | "medical_clearance";
  }[];
}
```

### Document Store (encrypted vault)

```typescript
interface IFamilyDocument {
  playerId: ObjectId;
  documentType: string;
  fileName: string;
  mimeType: string;
  encryptedBlob: Buffer;                // AES-256-GCM encrypted
  encryptionKeyId: string;              // Reference to key (family controls)
  uploadedAt: Date;
  uploadedBy: ObjectId;                 // Guardian who uploaded
  retentionPolicy: "keep" | "delete_after_verification" | "delete_after_days";
  retentionDays?: number;
  deletedAt?: Date;

  // Verification link
  verificationRecordId?: ObjectId;      // Links to the verification record created from this doc
}
```

### Document Grants (time-limited access)

```typescript
interface IDocumentGrant {
  documentId: ObjectId;
  grantedTo: string;                    // Tenant slug
  grantedBy: ObjectId;                  // Guardian who approved
  purpose: string;                      // "age_verification", "medical_clearance"
  accessType: "view_verified_info" | "view_document" | "download_document";

  // Time-limited
  grantedAt: Date;
  expiresAt: Date;                      // Family sets this
  revokedAt?: Date;

  // Access log
  accessLog: {
    accessedAt: Date;
    accessedBy: ObjectId;
    action: "viewed" | "downloaded" | "verified";
  }[];
}
```

## Verification Flow

### First-time verification (e.g., MidAmerica 7v7 2025)

```
1. Family uploads birth certificate to their vault
   → Encrypted, stored in family_<id>.documents
   → Only the family can decrypt it

2. MidAmerica requests age verification for Marcus Johnson
   → Platform creates a document_grant request
   → Parent gets notification: "MidAmerica 7v7 wants to verify Marcus's age"

3. Parent approves the grant (time-limited, 48 hours)
   → League reviewer sees: name, DOB from document, certificate #
   → Reviewer confirms: "Document matches, DOB verified"

4. Platform creates a verification_record
   → Stores: name, DOB, cert# hash, verifier, timestamp
   → Links to the document but does NOT copy it

5. Document grant expires after 48 hours
   → League can no longer view the document
   → Verification RECORD persists forever
```

### Subsequent verification (e.g., Court 45 Basketball 2026)

```
1. Court 45 registers Marcus for a new league event
   → League asks: "Is Marcus eligible for 14U?"

2. Platform checks family DB → verification_record exists
   → DOB: 2013-05-15 → Age at event: 13 → 14U eligible ✓
   → Verified by MidAmerica 7v7 on 2025-08-10
   → Certificate hash: matches

3. League sees: "VERIFIED — Age confirmed, no documents needed"
   → Zero documents transmitted
   → Zero re-upload required
   → Verification record updated: usedBy += Court 45

4. If league wants to see the actual document (unusual):
   → Must request a new grant from the family
   → Family can approve or deny
   → Time-limited access, logged
```

## What Gets Copied to Org/League DBs

When a family connects to an org or league, ONLY basic operational data is copied:

```
To Org DB (roster):              To League DB (registration):
├── playerName                   ├── playerName
├── jerseyNumber                 ├── orgName
├── position                     ├── teamName
├── verificationStatus (✓/✗)     ├── verificationStatus (✓/✗)
└── guardianName (for contact)   └── ageGroup

NOT copied:
├── DOB (only verification status)
├── Address
├── Medical info
├── Document content
├── Certificate numbers
└── Parent email/phone (only with explicit invite)
```

## Parent Dashboard (reads from family DB)

When a parent logs into `goparticipate.com`:

```
Family Dashboard
├── My Kids
│   ├── Marcus Johnson (KC Thunder 14U, MidAmerica 7v7 verified ✓)
│   └── Aiden Johnson (Court 45 12U Boys, not yet verified)
│
├── Upcoming Schedule (aggregated from all org DBs via connections[])
│   ├── Tue 4pm — KC Thunder Practice @ Swope Park
│   ├── Thu 6pm — Court 45 Practice @ Court 45 Facility
│   └── Sat 9am — MidAmerica Spring Showdown @ Swope Soccer Village
│
├── Messages (aggregated from all org DBs)
│   ├── KC Thunder: "Practice moved to Field 3"
│   └── Court 45: "Uniform order due Friday"
│
├── Payments
│   ├── KC Thunder: Season dues — $150 (paid)
│   └── Court 45: Tryout fee — $50 (pending)
│
├── Documents & Verification
│   ├── Marcus: Birth cert verified ✓ (reusable)
│   ├── Aiden: Birth cert not uploaded
│   └── [Upload Document] [Manage Grants]
│
└── Pending Invites
    └── Minnesota Heat wants to add Aiden → [Accept] [Decline]
```

## Security Model

```
Encryption: AES-256-GCM per document, family holds the key
Access: Grant-based, time-limited, logged, revocable
Storage: Family DB is isolated — no org/league can query it directly
Platform: Mediates all access, enforces grants, logs everything
Deletion: Family can delete any document at any time
Export: Family can export all their data (GDPR/CCPA compliant)
```

## Monetization

The verification vault is a **platform feature**, not a tenant feature:
- Free families get: basic profile, 1 document upload, manual verification
- Paid families or org-included: unlimited documents, instant re-verification
- Leagues pay per-verification if they want document review service
- The stickiness is the verified identity — once verified, leaving GP means re-verifying everywhere else

## Implementation Plan

| Step | What | Effort |
|------|------|--------|
| 1 | Family DB model + connection logic | Medium |
| 2 | Migration: move Player/Family from platform DB to family DBs | Medium |
| 3 | Verification record model + CRUD | Small |
| 4 | Document upload + encryption | Medium |
| 5 | Grant request/approve flow | Medium |
| 6 | Parent dashboard UI (reads from family DB) | Medium |
| 7 | Org/league verification check API (reads verification records) | Small |
| 8 | Audit log + access tracking | Small |
