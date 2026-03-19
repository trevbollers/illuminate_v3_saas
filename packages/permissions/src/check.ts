import type { Role } from "./roles";
import { DEFAULT_ROLE_PERMISSIONS } from "./permissions";

/**
 * Returns the full set of permissions for a given role (default role
 * permissions only, without any user-specific overrides).
 */
export function getRolePermissions(role: Role): string[] {
  return [...DEFAULT_ROLE_PERMISSIONS[role]];
}

/**
 * Resolves the effective permission set for a user by combining the default
 * permissions of their role with any extra permissions explicitly granted.
 */
function resolvePermissions(
  userRole: Role,
  userPermissions: string[],
): Set<string> {
  const defaults = DEFAULT_ROLE_PERMISSIONS[userRole] ?? [];
  const merged = new Set<string>([...defaults, ...userPermissions]);
  return merged;
}

/**
 * Checks whether a user has a specific permission.
 *
 * The effective permission set is the union of the role's default permissions
 * and any additional permissions passed via `userPermissions`.
 *
 * Owners always have all permissions regardless of what is stored.
 */
export function hasPermission(
  userRole: Role,
  userPermissions: string[],
  permission: string,
): boolean {
  if (userRole === "owner") return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return effective.has(permission);
}

/**
 * Checks whether a user has **at least one** of the given permissions.
 */
export function hasAnyPermission(
  userRole: Role,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (userRole === "owner") return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return permissions.some((p) => effective.has(p));
}

/**
 * Checks whether a user has **all** of the given permissions.
 */
export function hasAllPermissions(
  userRole: Role,
  userPermissions: string[],
  permissions: string[],
): boolean {
  if (userRole === "owner") return true;
  const effective = resolvePermissions(userRole, userPermissions);
  return permissions.every((p) => effective.has(p));
}
