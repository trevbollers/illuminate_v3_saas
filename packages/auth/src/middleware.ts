import { type NextRequest, NextResponse } from "next/server";
import { type Connection } from "mongoose";
import { auth } from "./config";
import type { TenantRole } from "./types";

export interface TenantContext {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: TenantRole;
  permissions: string[];
  /** Mongoose connection to the tenant's isolated database. */
  db: Connection;
}

interface WithTenantAuthOptions {
  /**
   * Minimum role required to access the route.
   * Role hierarchy: owner > admin > member > viewer
   */
  requiredRole?: TenantRole;

  /**
   * Specific permissions required (all must be present).
   */
  requiredPermissions?: string[];
}

const ROLE_HIERARCHY: Record<TenantRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function hasMinimumRole(
  userRole: TenantRole,
  requiredRole: TenantRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function hasPermissions(
  userPermissions: string[],
  required: string[],
): boolean {
  return required.every((p) => userPermissions.includes(p));
}

/**
 * Higher-order function that wraps an API route handler with tenant authentication.
 *
 * Validates that:
 * 1. The user is authenticated (has a valid JWT)
 * 2. The user has an active tenant context
 * 3. The user meets the required role / permissions
 *
 * On success, invokes the handler with the validated TenantContext, which
 * includes a `db` connection to the tenant's isolated database.
 *
 * Usage:
 * ```ts
 * import { withTenantAuth } from "@illuminate/auth";
 *
 * export const GET = withTenantAuth(
 *   async (req, ctx) => {
 *     // ctx.db is the tenant's own database connection
 *     const Product = ctx.db.model("Product");
 *     const products = await Product.find({ isActive: true });
 *     return NextResponse.json(products);
 *   },
 *   { requiredRole: "member" },
 * );
 * ```
 */
export function withTenantAuth(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<NextResponse>,
  options: WithTenantAuthOptions = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth();

      // 1. Check authentication
      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required." },
          { status: 401 },
        );
      }

      const { user } = session;

      // 2. Check tenant context exists
      if (!user.tenantId || !user.tenantSlug || !user.role) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message:
              "No active tenant context. Please select a workspace first.",
          },
          { status: 403 },
        );
      }

      // 3. Connect to the tenant's isolated database
      const { connectTenantDB } = await import("@illuminate/db");
      const tenantDB = await connectTenantDB(user.tenantSlug);

      const tenantCtx: TenantContext = {
        userId: user.id,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
        role: user.role,
        permissions: user.permissions ?? [],
        db: tenantDB,
      };

      // 4. Check minimum role
      if (options.requiredRole) {
        if (!hasMinimumRole(tenantCtx.role, options.requiredRole)) {
          return NextResponse.json(
            {
              error: "Forbidden",
              message: `Insufficient role. Required: ${options.requiredRole}, current: ${tenantCtx.role}.`,
            },
            { status: 403 },
          );
        }
      }

      // 5. Check specific permissions
      if (
        options.requiredPermissions &&
        options.requiredPermissions.length > 0
      ) {
        if (!hasPermissions(tenantCtx.permissions, options.requiredPermissions)) {
          const missing = options.requiredPermissions.filter(
            (p) => !tenantCtx.permissions.includes(p),
          );
          return NextResponse.json(
            {
              error: "Forbidden",
              message: `Missing permissions: ${missing.join(", ")}.`,
            },
            { status: 403 },
          );
        }
      }

      // All checks passed - invoke the handler
      return handler(req, tenantCtx);
    } catch (error) {
      console.error("[auth/middleware] Unexpected error:", error);
      return NextResponse.json(
        { error: "Internal Server Error", message: "Authentication failed." },
        { status: 500 },
      );
    }
  };
}

/**
 * Middleware helper for Next.js middleware.ts that validates tenant access
 * at the edge. Use this in your root middleware for route protection.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { withTenantMiddleware } from "@illuminate/auth";
 * export default withTenantMiddleware;
 * export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
 * ```
 */
export function withTenantMiddleware(req: NextRequest) {
  // The authorized callback in authConfig handles the core logic.
  // This export enables composing with other middleware if needed.
  return auth(async function middleware(req) {
    // Auth middleware runs the `authorized` callback from authConfig.
    // Additional tenant-level edge checks can be added here.
    return NextResponse.next();
  })(req, {} as any);
}
