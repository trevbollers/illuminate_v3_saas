import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that checks tenant membership and authentication.
 *
 * In production this would:
 * 1. Verify the user's session/JWT token
 * 2. Extract the tenant ID from the subdomain or path
 * 3. Verify the user has an active membership in that tenant
 * 4. Check that the tenant's subscription is active
 * 5. Redirect to login or error pages as needed
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // In production, check for auth cookie/session
  const sessionToken =
    request.cookies.get("session-token")?.value ??
    request.cookies.get("__session")?.value;

  // For development, allow all requests through
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // In production, verify the session token and check tenant membership
  // This would call your auth service to validate:
  // - Token is valid and not expired
  // - User belongs to the current tenant
  // - Tenant subscription is active
  // - User has appropriate permissions

  const response = NextResponse.next();

  // Add tenant context headers for downstream use
  response.headers.set("x-tenant-id", "tenant-placeholder");
  response.headers.set("x-user-id", "user-placeholder");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
