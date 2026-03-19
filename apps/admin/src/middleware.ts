import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@illuminate/auth";

/**
 * Admin portal middleware — restricts access to super_admin users only.
 *
 * Security checks:
 * 1. User is authenticated via NextAuth JWT (not a spoofable cookie)
 * 2. User has platformRole === "super_admin" in their verified JWT claims
 *
 * On failure:
 * - Unauthenticated → redirect to login
 * - Wrong role → 403 (generic, no information leakage)
 */
export async function middleware(request: NextRequest) {
  // Allow Next.js internals and static assets through
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // --- 1. Authenticate via NextAuth JWT ---
  const session = await auth();

  if (!session?.user) {
    // Not logged in — redirect to login
    const loginUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    );
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirect", request.nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // --- 2. Verify super_admin role from JWT claims ---
  // This comes from the verified JWT token, NOT a cookie or header.
  // The platformRole is set during sign-in from the database and cannot
  // be tampered with by the client.
  if (session.user.platformRole !== "super_admin") {
    const isApiRequest =
      request.headers.get("accept")?.includes("application/json");

    if (isApiRequest) {
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient privileges." },
        { status: 403 },
      );
    }

    // Generic denial page — don't reveal that this is an admin portal
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
