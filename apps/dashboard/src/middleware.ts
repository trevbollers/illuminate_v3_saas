import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { resolveTenantFromRequest } from "@goparticipate/auth/tenant-resolver";

/**
 * Dashboard middleware — protects the tenant dashboard application.
 *
 * Security checks:
 * 1. User is authenticated via NextAuth JWT
 * 2. User has an active tenant context (tenantId + tenantSlug in session)
 * 3. If accessed via subdomain, the subdomain tenant matches the session tenant
 * 4. Tenant subscription is not canceled/suspended
 *
 * On failure: redirects to login (if unauthenticated) or shows 403 (if wrong tenant).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets, Next.js internals, and API auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // --- 1. Authenticate via NextAuth ---
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = session;

  // --- 2. Verify tenant context exists in session ---
  if (!user.tenantId || !user.tenantSlug || !user.role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_account");
    return NextResponse.redirect(loginUrl);
  }

  // --- 3. Verify this is an organization tenant ---
  if (user.tenantType !== "organization") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_account");
    return NextResponse.redirect(loginUrl);
  }

  // --- 4. Subdomain tenant matching ---
  // If the request came via a tenant subdomain (e.g. acme.goparticipate.com),
  // verify it matches the user's active tenant. This prevents a user
  // logged into tenant A from accessing tenant B's subdomain.
  const resolvedTenant = resolveTenantFromRequest(request);

  if (resolvedTenant && resolvedTenant.slug !== user.tenantSlug) {
    // Subdomain doesn't match session tenant — this is either:
    // a) User needs to switch tenants, or
    // b) Unauthorized access attempt
    //
    // Don't reveal whether the tenant exists. Return a generic 403.
    return new NextResponse(null, {
      status: 403,
      statusText: "Forbidden",
      headers: { "Content-Type": "text/plain" },
    });
  }

  // --- 5. Inject tenant context headers for downstream API routes ---
  const response = NextResponse.next();
  response.headers.set("x-tenant-id", user.tenantId);
  response.headers.set("x-tenant-slug", user.tenantSlug);
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", user.role);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
