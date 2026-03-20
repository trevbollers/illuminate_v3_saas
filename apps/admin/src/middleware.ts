import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@illuminate/auth/edge";

/**
 * Admin portal middleware — restricts access to saas_admin users only.
 *
 * Security checks:
 * 1. User is authenticated via NextAuth JWT (not a spoofable cookie)
 * 2. User has platformRole === "saas_admin" in their verified JWT claims
 *
 * On failure:
 * - Unauthenticated → redirect to /login
 * - Wrong role → 403 (generic, no information leakage)
 */
export async function middleware(request: NextRequest) {
  // Allow Next.js internals, static assets, auth API, and login page through
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // --- 1. Authenticate via NextAuth JWT ---
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- 2. Verify saas_admin role from JWT claims ---
  if (session.user.platformRole !== "saas_admin") {
    const isApiRequest =
      request.headers.get("accept")?.includes("application/json");

    if (isApiRequest) {
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient privileges." },
        { status: 403 },
      );
    }

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Access Denied</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc;">
  <div style="text-align: center; max-width: 400px; padding: 2rem;">
    <h1 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">Access Denied</h1>
    <p style="color: #64748b; margin-bottom: 1.5rem;">You do not have permission to access this page.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "/"}" style="display: inline-block; padding: 0.5rem 1rem; background: #2563eb; color: white; border-radius: 0.375rem; text-decoration: none; font-size: 0.875rem;">Go Home</a>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  // --- 3. Inject admin context headers ---
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.user.id);
  response.headers.set("x-platform-role", session.user.platformRole);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
