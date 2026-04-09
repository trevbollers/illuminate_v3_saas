# File Storage Architecture

## Current State (Development)

All uploads save to `apps/<app>/public/uploads/` on local disk via Sharp image processing.
This works for local dev but **must be replaced before production deploy**.

**Current upload flow:**
1. Client sends file via FormData to API route
2. `packages/db/src/utils/image-processor.ts` processes with Sharp (resize, convert to webp)
3. Result saved to `public/uploads/<filename>.webp`
4. URL stored in MongoDB document (e.g., `event.posterUrl`)

---

## Production Architecture: S3 + CloudFront

### Bucket Structure

```
s3://goparticipate-uploads/
│
├── league/<tenant-slug>/
│   ├── events/<eventId>/poster.webp
│   ├── events/<eventId>/banner.webp
│   ├── branding/logo.webp
│   ├── branding/favicon.webp
│   ├── waivers/<waiverId>.pdf
│   └── announcements/<id>/attachment.*
│
├── org/<tenant-slug>/
│   ├── branding/logo.webp
│   ├── teams/<teamId>/photo.webp
│   ├── rosters/imports/<filename>.xlsx
│   ├── uniforms/<orderId>/mockup.webp
│   └── receipts/<transactionId>.pdf
│
├── family/<familyId>/                    ← ENCRYPTED AT REST
│   ├── documents/<docId>.enc            ← client-side encrypted blobs
│   ├── documents/<docId>.meta.json      ← encrypted metadata
│   └── player-photos/<playerId>.webp
│
└── platform/
    ├── email-templates/
    ├── sport-assets/                     ← sport icons, field diagrams
    └── marketing/                        ← landing page assets
```

### Access Tiers

| Content Type | Access | Delivery | Example |
|-------------|--------|----------|---------|
| Event posters, logos | **Public** | CloudFront CDN | `cdn.goparticipate.com/league/midamerica-7v7/events/.../poster.webp` |
| Roster imports, receipts | **Private** | Pre-signed URL (15 min expiry) | Org admins only |
| Family documents | **Encrypted + Private** | Pre-signed URL + client-side decryption | Grant-based access per `docs/go-participate/07-DATA-OWNERSHIP.md` |
| Waivers, attachments | **Tenant-scoped** | Pre-signed URL | League members only |

### Content-Addressed Filenames

Use hash-based filenames to prevent overwrites and enable deduplication:
```
<prefix>-<contentHash>-<timestamp>.webp
e.g., event-a1b2c3d4-1710000000.webp
```

---

## Required AWS Resources

### S3 Bucket
- **Bucket name:** `goparticipate-uploads` (prod), `goparticipate-uploads-dev` (staging)
- **Region:** `us-east-1` (same as app servers)
- **Versioning:** Enabled (accidental delete recovery)
- **Lifecycle rules:**
  - Transition to S3 Infrequent Access after 90 days for `/family/` prefix
  - Delete incomplete multipart uploads after 7 days
- **Encryption:** SSE-S3 default, SSE-KMS for `/family/` prefix
- **CORS:** Allow `goparticipate.com`, `*.goparticipate.com`

### CloudFront Distribution
- **Origin:** S3 bucket (OAC — Origin Access Control)
- **Domain:** `cdn.goparticipate.com`
- **Behaviors:**
  - `/league/*/branding/*` and `/league/*/events/*/poster*` → Public, cache 7 days
  - `/org/*/branding/*` → Public, cache 7 days
  - `/platform/*` → Public, cache 30 days
  - Everything else → No cache (pre-signed URLs)
- **SSL:** ACM certificate for `cdn.goparticipate.com`

### IAM Policy
- App server role gets `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
- Scoped to bucket ARN
- Pre-signed URL generation via `s3:GetObject` with expiry

---

## Environment Variables Needed

```env
# S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET=goparticipate-uploads
AWS_ACCESS_KEY_ID=<from IAM>
AWS_SECRET_ACCESS_KEY=<from IAM>

# CloudFront
CLOUDFRONT_DOMAIN=cdn.goparticipate.com
CLOUDFRONT_DISTRIBUTION_ID=<from CloudFront>
CLOUDFRONT_KEY_PAIR_ID=<for signed URLs>
CLOUDFRONT_PRIVATE_KEY=<base64 encoded>

# Upload limits
MAX_UPLOAD_SIZE_MB=20
IMAGE_QUALITY=85
IMAGE_MAX_DIMENSION=1600
```

---

## Implementation Plan

### Phase 1: S3 Upload (Pre-Launch)
- [ ] Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] Create `packages/storage/` package with:
  - `uploadFile(buffer, key, contentType)` → S3 PutObject
  - `getSignedUrl(key, expiresIn)` → pre-signed GET URL
  - `deleteFile(key)` → S3 DeleteObject
  - `getPublicUrl(key)` → CloudFront URL for public assets
- [ ] Update `image-processor.ts` to return buffer instead of writing to disk
- [ ] Create `packages/storage/src/upload.ts`:
  ```typescript
  async function uploadImage(file: File, tenantSlug: string, tenantType: string, path: string) {
    const processed = await processImage(file, options);
    const key = `${tenantType}/${tenantSlug}/${path}`;
    await s3Upload(processed.buffer, key, 'image/webp');
    return { url: getPublicUrl(key), ...processed.metadata };
  }
  ```
- [ ] Update all API upload routes to use `packages/storage` instead of local disk
- [ ] Add `public/uploads/` to `.gitignore` (if not already)

### Phase 2: CloudFront CDN
- [ ] Create CloudFront distribution with OAC
- [ ] Configure custom domain `cdn.goparticipate.com`
- [ ] Update public URL generation to use CloudFront domain
- [ ] Add cache invalidation on re-upload (logo change, poster update)

### Phase 3: Pre-Signed URLs for Private Content
- [ ] Implement signed URL generation for roster imports, receipts
- [ ] Add URL expiry (15 min default, configurable)
- [ ] Audit all file access to ensure private files use signed URLs

### Phase 4: Family Document Vault (Post-Launch)
- [ ] Client-side encryption before upload (Web Crypto API)
- [ ] S3 SSE-KMS for family prefix
- [ ] Grant-based access: check `document_grants` before generating signed URL
- [ ] Time-limited decryption keys per grant
- [ ] See `docs/go-participate/07-DATA-OWNERSHIP.md` for full encryption spec

---

## Migration from Local Disk

When ready to deploy:
1. Any files in `public/uploads/` are dev-only test data
2. No migration needed — just switch the storage backend
3. Update `image-processor.ts` to return `{ buffer, metadata }` instead of writing files
4. All new uploads go through `packages/storage`

---

## Cost Estimates (AWS)

| Resource | Estimate | Notes |
|----------|----------|-------|
| S3 Storage | ~$0.023/GB/mo | Event posters average ~200KB each |
| S3 Requests | ~$0.005/1000 PUT | Minimal at launch |
| CloudFront | ~$0.085/GB transfer | Free tier: 1TB/mo first year |
| Data transfer | ~$0.09/GB out from S3 | CloudFront is cheaper |

**At launch (100 leagues, 500 orgs):** Likely under $5/month for storage + CDN.
