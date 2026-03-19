import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that restricts access to the admin portal to users
 * with the `super_admin` platform role.
 *
 * In production this would validate the session/JWT and check the
 * user's platformRole against the database. For now it checks for
 * a `platformRole` cookie or header that equals "super_admin".
 */
export function middleware(request: NextRequest) {
  // Allow Next.js internals and static assets through
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for super_admin role via cookie (set after login) or header (API)
  const roleCookie = request.cookies.get("platformRole")?.value;
  const roleHeader = request.headers.get("x-platform-role");
  const role = roleCookie || roleHeader;

  if (role !== "super_admin") {
    // In production, redirect to the main app login with an error
    // For now, return a 403 JSON response for API-like clarity
    const isApiRequest =
      request.headers.get("accept")?.includes("application/json");

    if (isApiRequest) {
      return NextResponse.json(
        { error: "Forbidden", message: "Super admin access required" },
        { status: 403 }
      );
    }

    // For browser requests, show a styled forbidden page
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Access Denied - Illuminate Admin</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc;">
  <div style="text-align: center; max-width: 400px; padding: 2rem;">
    <div style="font-size: 3rem; margin-bottom: 1rem;">&#128274;</div>
    <h1 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">Access Denied</h1>
    <p style="color: #64748b; margin-bottom: 1.5rem;">You must be a super admin to access this portal. Please contact your platform administrator.</p>
    <a href="/" style="display: inline-block; padding: 0.5rem 1rem; background: #2563eb; color: white; border-radius: 0.375rem; text-decoration: none; font-size: 0.875rem;">Return Home</a>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
