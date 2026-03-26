// ─── Platform Roles ─────────────────────────────────────────────────────────

export const PLATFORM_ROLES = {
  gp_admin: { label: "Admin", level: 100 },
  gp_support: { label: "Support", level: 50 },
  user: { label: "User", level: 0 },
} as const;

export type PlatformRole = keyof typeof PLATFORM_ROLES;

// ─── League Tenant Roles ────────────────────────────────────────────────────

export const LEAGUE_ROLES = {
  league_owner: { label: "League Owner", level: 100 },
  league_admin: { label: "League Admin", level: 80 },
  league_staff: { label: "League Staff", level: 60 },
  league_viewer: { label: "League Viewer", level: 20 },
} as const;

export type LeagueRole = keyof typeof LEAGUE_ROLES;

// ─── Organization Tenant Roles ──────────────────────────────────────────────

export const ORG_ROLES = {
  org_owner: { label: "Org Owner", level: 100 },
  org_admin: { label: "Org Admin", level: 80 },
  head_coach: { label: "Head Coach", level: 60 },
  assistant_coach: { label: "Assistant Coach", level: 40 },
  team_manager: { label: "Team Manager", level: 40 },
  viewer: { label: "Viewer", level: 20 },
} as const;

export type OrgRole = keyof typeof ORG_ROLES;

// ─── Combined tenant role (used in memberships) ─────────────────────────────

export type TenantRole = LeagueRole | OrgRole;

// ─── Tenant type ────────────────────────────────────────────────────────────

export type TenantType = "league" | "organization";

// ─── Utilities ──────────────────────────────────────────────────────────────

export function getRoleLevel(role: TenantRole): number {
  if (role in LEAGUE_ROLES) return LEAGUE_ROLES[role as LeagueRole].level;
  if (role in ORG_ROLES) return ORG_ROLES[role as OrgRole].level;
  return 0;
}

export function isRoleAtLeast(roleA: TenantRole, roleB: TenantRole): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

export function isOwnerRole(role: TenantRole): boolean {
  return role === "league_owner" || role === "org_owner";
}

export function getLeagueRoleHierarchy() {
  return (Object.entries(LEAGUE_ROLES) as [LeagueRole, { label: string; level: number }][])
    .sort((a, b) => b[1].level - a[1].level)
    .map(([role, info]) => ({ role, info }));
}

export function getOrgRoleHierarchy() {
  return (Object.entries(ORG_ROLES) as [OrgRole, { label: string; level: number }][])
    .sort((a, b) => b[1].level - a[1].level)
    .map(([role, info]) => ({ role, info }));
}
