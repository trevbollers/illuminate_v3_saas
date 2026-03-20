import type { DefaultSession, DefaultJWT } from "next-auth";

export type PlatformRole = "saas_admin" | "platform_admin" | "user";

export type TenantRole = "owner" | "admin" | "member" | "viewer";

export interface TenantMembership {
  tenantId: string;
  tenantSlug: string;
  role: TenantRole;
  permissions: string[];
  isActive: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      tenantSlug: string | null;
      role: TenantRole | null;
      platformRole: PlatformRole;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    platformRole?: PlatformRole;
    memberships?: TenantMembership[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string;
    tenantId: string | null;
    tenantSlug: string | null;
    role: TenantRole | null;
    platformRole: PlatformRole;
    permissions: string[];
  }
}
