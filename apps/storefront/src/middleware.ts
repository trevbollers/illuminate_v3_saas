import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  resolveTenantFromRequest,
  extractCustomDomain,
} from "@illuminate/auth/tenant-resolver";

/**
 * Storefront middleware — resolves which tenant's storefront to serve.
 *
 * The storefront is PUBLIC (customers don't need to log in to browse).
 * Tenant resolution determines which product catalog, branding, and
 * configuration to load.
 *
 * Resolution methods:
 * 1. Subdomain: acme.meatlocker.app → tenant slug "acme"
 * 2. Custom domain: shop.acmemeat.com → DB lookup by customDomain field
 * 3. x-tenant-slug header (development only)
 *
 * On failure: 404 (generic — doesn't reveal whether the tenant exists).
 *
 * Security notes:
 * - No authentication required for browsing
 * - Checkout routes DO require authentication (handled by checkout page)
 * - Tenant data isolation is enforced at the database level (separate DBs)
 * - Rate limiting should be applied at the CDN/edge layer
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // --- 1. Resolve tenant from subdomain or header ---
  const resolvedTenant = resolveTenantFromRequest(request);

  if (resolvedTenant) {
    // Tenant found via subdomain — inject context for the app
    const response = NextResponse.next();
    response.headers.set("x-tenant-slug", resolvedTenant.slug);
    response.headers.set("x-tenant-source", resolvedTenant.source);
    return response;
  }

  // --- 2. Check for custom domain ---
  const customDomain = extractCustomDomain(request);

  if (customDomain) {
    // Custom domain detected. The app will resolve this to a tenant slug
    // via a DB lookup in the page's server component or API route.
    // We pass the hostname through so the app can look it up.
    const response = NextResponse.next();
    response.headers.set("x-custom-domain", customDomain);
    response.headers.set("x-tenant-source", "custom_domain");
    return response;
  }

  // --- 3. No tenant could be resolved ---
  // In development, allow through (pages handle their own tenant context)
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // In production, return a 404 — don't reveal anything about tenant existence
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Store Not Found</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc;">
  <div style="text-align: center; max-width: 400px; padding: 2rem;">
    <h1 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">Store Not Found</h1>
    <p style="color: #64748b;">The store you're looking for doesn't exist or is no longer available.</p>
  </div>
</body>
</html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html" },
    },
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
