import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Defense-in-depth auth guard for admin API routes.
 *
 * The admin middleware already enforces gp_admin on all non-auth routes
 * and sets x-platform-role / x-user-id headers. This function provides
 * a secondary check inside route handlers so that even if middleware is
 * somehow bypassed (misconfigured matcher, direct fetch in tests, etc.),
 * the route still rejects unauthorized requests.
 *
 * Returns null if authorized, or a 403 NextResponse to return immediately.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const h = await headers();
  const role = h.get("x-platform-role");

  // Fast path: middleware already verified and set the header
  if (role === "gp_admin") return null;

  // Slow path: re-check session directly (middleware may not have run)
  const session = await auth();
  if (session?.user?.platformRole === "gp_admin") return null;

  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  );
}
