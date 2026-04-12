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

  // Redirect authenticated users away from auth pages to their dashboard
  if (session?.user) {
    const authPages = ["/auth/login", "/signup", "/register"];
    if (authPages.some((p) => pathname.startsWith(p))) {
      // Determine redirect target based on tenant membership
      const membership = (session.user as any).activeMembership;
      if (membership) {
        const dashboardUrl =
          process.env.NEXT_PUBLIC_DASHBOARD_URL ||
          `https://${membership.slug}.goparticipate.com`;
        return NextResponse.redirect(dashboardUrl);
      }
      // No membership — send to home page
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
