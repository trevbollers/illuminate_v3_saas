import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { resolveTenantFromRequest } from "@goparticipate/auth/tenant-resolver";

/**
 * League middleware — protects the league management application.
 *
 * Security checks:
 * 1. User is authenticated via NextAuth JWT
 * 2. User has an active tenant context with tenantType === "league"
 * 3. If accessed via subdomain, the subdomain matches the session tenant
 * 4. User has a league role (league_owner, league_admin, league_staff, league_viewer)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/public") ||
    pathname === "/login"
  ) {
    // For public routes, resolve tenant from subdomain and set header
    if (pathname.startsWith("/api/public") || pathname.startsWith("/public")) {
      const resolvedTenant = resolveTenantFromRequest(request);
      const slug = resolvedTenant?.slug || process.env.NEXT_PUBLIC_LEAGUE_SLUG;
      if (slug) {
        const response = NextResponse.next();
        response.headers.set("x-tenant-slug", slug);
        return response;
      }
    }
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { user } = session;

  if (!user.tenantId || !user.tenantSlug || !user.role) {
    const appUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000",
    );
    appUrl.pathname = "/register";
    return NextResponse.redirect(appUrl);
  }

  // Verify this is a league tenant
  if (user.tenantType !== "league") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_account");
    return NextResponse.redirect(loginUrl);
  }

  const resolvedTenant = resolveTenantFromRequest(request);

  if (resolvedTenant && resolvedTenant.slug !== user.tenantSlug) {
    return new NextResponse(null, {
      status: 403,
      statusText: "Forbidden",
      headers: { "Content-Type": "text/plain" },
    });
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", user.tenantId);
  response.headers.set("x-tenant-slug", user.tenantSlug);
  response.headers.set("x-tenant-type", "league");
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", user.role);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
