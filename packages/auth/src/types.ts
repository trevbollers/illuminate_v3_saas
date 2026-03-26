import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

export type PlatformRole = "gp_admin" | "gp_support" | "user";

export type TenantType = "league" | "organization";

export interface TenantMembership {
  tenantId: string;
  tenantSlug: string;
  tenantType: TenantType;
  role: string;
  permissions: string[];
  isActive: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      tenantSlug: string | null;
      tenantType: TenantType | null;
      role: string | null;
      platformRole: PlatformRole;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    platformRole?: PlatformRole;
    memberships?: TenantMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string;
    tenantId: string | null;
    tenantSlug: string | null;
    tenantType: TenantType | null;
    role: string | null;
    platformRole: PlatformRole;
    permissions: string[];
  }
}
