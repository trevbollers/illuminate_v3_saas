import type { TenantRole, LeagueRole, OrgRole } from "./roles";
import { isOwnerRole, LEAGUE_ROLES } from "./roles";
import { DEFAULT_LEAGUE_ROLE_PERMISSIONS, DEFAULT_ORG_ROLE_PERMISSIONS } from "./permissions";

/**
 * Returns the default permissions for a tenant role (league or org).
 */
export function getRolePermissions(role: TenantRole): string[] {
  if (role in DEFAULT_LEAGUE_ROLE_PERMISSIONS) {
    return [...DEFAULT_LEAGUE_ROLE_PERMISSIONS[role as LeagueRole]];
  }
  if (role in DEFAULT_ORG_ROLE_PERMISSIONS) {
    return [...DEFAULT_ORG_ROLE_PERMISSIONS[role as OrgRole]];
  }
  return [];
}

function resolvePermissions(userRole: TenantRole, userPermissions: string[]): Set<string> {
  const defaults = getRolePermissions(userRole);
  return new Set<string>([...defaults, ...userPermissions]);
}

/**
 * Checks whether a user has a specific permission.
 * Owner roles (league_owner, org_owner) always return true.
 */
export function hasPermission(
  userRole: TenantRole,
  userPermissions: string[],
  permission: string,
): boolean {
  if (isOwnerRole(userRole)) return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return effective.has(permission);
}

export function hasAnyPermission(
  userRole: TenantRole,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (isOwnerRole(userRole)) return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return permissions.some((p) => effective.has(p));
}

export function hasAllPermissions(
  userRole: TenantRole,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (isOwnerRole(userRole)) return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return permissions.every((p) => effective.has(p));
}

// ─── Platform permission checks ──────────────────────────────────────────────

export function hasPlatformPermission(
  platformRole: string,
  platformPermissions: string[],
  permission: string,
): boolean {
  if (platformRole === "gp_admin") return true;
  return platformPermissions.includes(permission);
}

export function hasAnyPlatformPermission(
  platformRole: string,
  platformPermissions: string[],
  permissions: string[],
): boolean {
  if (platformRole === "gp_admin") return true;
  return permissions.some((p) => platformPermissions.includes(p));
}

export function hasAllPlatformPermissions(
  platformRole: string,
  platformPermissions: string[],
  permissions: string[],
): boolean {
  if (platformRole === "gp_admin") return true;
  return permissions.every((p) => platformPermissions.includes(p));
}
