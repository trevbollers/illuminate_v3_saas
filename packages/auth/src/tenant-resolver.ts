/**
 * Tenant resolution utilities.
 *
 * Resolves which tenant a request belongs to by examining:
 * 1. Subdomain (e.g. acme.goparticipate.com → slug "acme")
 * 2. Custom domain (e.g. app.kcthunder.com → lookup in tenants collection)
 * 3. Explicit header (e.g. x-tenant-slug for API testing)
 *
 * This module is designed to run at the Edge (Next.js middleware) so it
 * uses the lightweight MongoDB client rather than Mongoose.
 */

import type { NextRequest } from "next/server";

/** The base domain(s) where tenants are accessed via subdomain. */
const PLATFORM_DOMAINS = (
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "goparticipate.com"
)
  .split(",")
  .map((d) => d.trim().toLowerCase());

/** Subdomains that are reserved and NOT tenant slugs. */
const RESERVED_SUBDOMAINS = new Set([
  // Platform infrastructure
  "www",
  "api",
  "app",
  "auth",
  "billing",
  "docs",
  "help",
  "mail",
  "status",
  "support",
  // App subdomains — each of our Next.js apps has its own subdomain
  "admin",
  "dash",
  "league",
  "store",
  // Beta marketing root (sub-of-sub setup during pre-launch)
  "gameon",
]);

export interface ResolvedTenant {
  slug: string;
  source: "subdomain" | "custom_domain" | "header" | "path";
}

/**
 * Extract the tenant slug from the incoming request.
 *
 * Resolution order:
 * 1. `x-tenant-slug` header (dev/testing only)
 * 2. Subdomain of platform domain (e.g. `acme.goparticipate.com`)
 * 3. Falls back to null if no tenant can be determined
 *
 * Custom domain resolution requires a DB lookup and is handled
 * separately by the storefront middleware.
 */
export function resolveTenantFromRequest(
  request: NextRequest,
): ResolvedTenant | null {
  // 1. Explicit header (dev/testing)
  if (process.env.NODE_ENV === "development") {
    const headerSlug = request.headers.get("x-tenant-slug");
    if (headerSlug) {
      return { slug: headerSlug, source: "header" };
    }
  }

  // 2. Subdomain of platform domain
  const hostname = request.headers.get("host")?.toLowerCase() ?? "";
  const hostnameWithoutPort = hostname.split(":")[0]!;

  for (const baseDomain of PLATFORM_DOMAINS) {
    if (hostnameWithoutPort.endsWith(`.${baseDomain}`)) {
      const subdomain = hostnameWithoutPort.replace(`.${baseDomain}`, "");

      // Ignore reserved subdomains
      if (RESERVED_SUBDOMAINS.has(subdomain)) {
        return null;
      }

      // Validate slug format (lowercase alphanumeric + hyphens)
      if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) || /^[a-z0-9]$/.test(subdomain)) {
        return { slug: subdomain, source: "subdomain" };
      }
    }
  }

  // 3. No tenant resolved
  return null;
}

/**
 * Check if a hostname is a custom domain (not a platform subdomain).
 * If so, return the hostname for DB lookup.
 */
export function extractCustomDomain(
  request: NextRequest,
): string | null {
  const hostname = request.headers.get("host")?.toLowerCase() ?? "";
  const hostnameWithoutPort = hostname.split(":")[0]!;

  // Check if it's NOT a platform domain
  const isPlatformDomain = PLATFORM_DOMAINS.some(
    (d) =>
      hostnameWithoutPort === d ||
      hostnameWithoutPort.endsWith(`.${d}`),
  );

  // Also not localhost
  const isLocalhost =
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort.startsWith("127.") ||
    hostnameWithoutPort === "0.0.0.0";

  if (!isPlatformDomain && !isLocalhost) {
    return hostnameWithoutPort;
  }

  return null;
}
