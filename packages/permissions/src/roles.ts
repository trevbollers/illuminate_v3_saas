export const ROLES = {
  owner: { label: "Owner", level: 100 },
  admin: { label: "Admin", level: 80 },
  manager: { label: "Manager", level: 60 },
  staff: { label: "Staff", level: 40 },
  viewer: { label: "Viewer", level: 20 },
} as const;

export type Role = keyof typeof ROLES;

export type RoleInfo = (typeof ROLES)[Role];

/**
 * Returns an ordered list of roles from highest to lowest level.
 */
export function getRoleHierarchy(): { role: Role; info: RoleInfo }[] {
  return (Object.entries(ROLES) as [Role, RoleInfo][])
    .sort((a, b) => b[1].level - a[1].level)
    .map(([role, info]) => ({ role, info }));
}

/**
 * Check if roleA has a higher or equal level than roleB.
 */
export function isRoleAtLeast(roleA: Role, roleB: Role): boolean {
  return ROLES[roleA].level >= ROLES[roleB].level;
}
