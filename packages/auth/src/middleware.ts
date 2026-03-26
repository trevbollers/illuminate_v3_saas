import { type NextRequest, NextResponse } from "next/server";
import { type Connection } from "mongoose";
import { auth } from "./config";
import type { TenantType } from "./types";

export interface TenantContext {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  tenantType: TenantType;
  role: string;
  permissions: string[];
  db: Connection;
}

interface WithTenantAuthOptions {
  requiredPermissions?: string[];
}

/**
 * Higher-order function that wraps an API route handler with tenant authentication.
 *
 * Validates that:
 * 1. The user is authenticated (has a valid JWT)
 * 2. The user has an active tenant context
 * 3. The user meets the required permissions
 *
 * On success, invokes the handler with the validated TenantContext, which
 * includes a `db` connection to the tenant's isolated database.
 */
export function withTenantAuth(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<NextResponse>,
  options: WithTenantAuthOptions = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required." },
          { status: 401 },
        );
      }

      const { user } = session;

      if (!user.tenantId || !user.tenantSlug || !user.role || !user.tenantType) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "No active tenant context. Please select a workspace first.",
          },
          { status: 403 },
        );
      }

      const { connectTenantDB } = await import("@goparticipate/db");
      const tenantDB = await connectTenantDB(user.tenantSlug, user.tenantType);

      const tenantCtx: TenantContext = {
        userId: user.id,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
        tenantType: user.tenantType,
        role: user.role,
        permissions: user.permissions ?? [],
        db: tenantDB,
      };

      if (
        options.requiredPermissions &&
        options.requiredPermissions.length > 0
      ) {
        const missing = options.requiredPermissions.filter(
          (p) => !tenantCtx.permissions.includes(p),
        );
        if (missing.length > 0) {
          return NextResponse.json(
            {
              error: "Forbidden",
              message: `Missing permissions: ${missing.join(", ")}.`,
            },
            { status: 403 },
          );
        }
      }

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

export function withTenantMiddleware(req: NextRequest) {
  return auth(async function middleware(req) {
    return NextResponse.next();
  })(req, {} as any);
}
