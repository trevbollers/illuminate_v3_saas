import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@goparticipate/auth/edge";

/**
 * Web app middleware — marketing site + auth flows.
 *
 * Most pages are public (home, pricing, auth, signup). This middleware:
 * 1. Redirects authenticated users away from login/signup to their dashboard
 * 2. Protects /api/billing/* (except webhook) — requires authentication
 * 3. Sets basic security headers
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals, static assets, and public API routes through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/plans") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/billing/webhook")
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  // Redirect authenticated users away from auth pages to wherever "home" is
  // for them, so they never land on the marketing site's anonymous view.
  // Platform admins (gp_admin, gp_support) bypass this — they need to access
  // signup/login to test flows without logging out of their admin session.
  const u = session?.user as any;
  const platformRole: string | undefined = u?.platformRole;
  const isPlatformAdmin = platformRole === "gp_admin" || platformRole === "gp_support";
  if (session?.user && !isPlatformAdmin) {
    const authPages = ["/auth/login", "/signup", "/register"];
    if (authPages.some((p) => pathname.startsWith(p))) {
      const tenantType: string | undefined = u?.tenantType;
      const tenantSlug: string | undefined = u?.tenantSlug;
      const familyId: string | null | undefined = u?.familyId;

      // League admin → league app
      if (tenantType === "league") {
        return NextResponse.redirect(
          process.env.NEXT_PUBLIC_LEAGUE_URL ||
            (tenantSlug ? `https://${tenantSlug}.goparticipate.com` : new URL("/", request.url).toString()),
        );
      }
      // Org / team owner → dashboard app
      if (tenantType === "organization") {
        return NextResponse.redirect(
          process.env.NEXT_PUBLIC_DASHBOARD_URL ||
            (tenantSlug ? `https://${tenantSlug}.goparticipate.com` : new URL("/", request.url).toString()),
        );
      }
      // Parent / family → /family on this app (same marketing domain)
      if (familyId) {
        return NextResponse.redirect(new URL("/family", request.url));
      }
      // Fallback — send to home page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect billing API endpoints (except webhook, handled above)
  if (pathname.startsWith("/api/billing")) {
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Set security headers on all responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
