import { DEFAULT_LEAGUE_ROLE_PERMISSIONS, DEFAULT_ORG_ROLE_PERMISSIONS, ALL_LEAGUE_PERMISSIONS, ALL_ORG_PERMISSIONS } from "./permissions";
import { LEAGUE_ROLES, ORG_ROLES } from "./roles";
import { flattenTreeToArray } from "./tree-utils";
import { PLATFORM_PERMISSION_TREE } from "./trees/platform";

/**
 * A role template defines a named set of permissions.
 * Built-in templates are defined in code. Custom roles
 * can be stored in the database using the same shape.
 */
export interface RoleTemplate {
  /** Role identifier (e.g., "league_owner", "org_admin") */
  id: string;
  /** Human-readable name */
  label: string;
  /** Description for the role editor UI */
  description: string;
  /** Numeric level for hierarchy comparison (higher = more powerful) */
  level: number;
  /** The set of permissionKey strings this role grants */
  permissions: readonly string[];
  /** Whether this is a built-in role (cannot be deleted) */
  builtIn: boolean;
  /** Which scope this role applies to */
  scope: "platform" | "league" | "organization";
}

// ─── All platform permission keys ────────────────────────────────────────────

const ALL_PLATFORM_PERMISSIONS = flattenTreeToArray(PLATFORM_PERMISSION_TREE);

// ─── Platform Role Templates ─────────────────────────────────────────────────

export const PLATFORM_ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  gp_admin: {
    id: "gp_admin",
    label: "Admin",
    description: "Full platform access — all permissions on all features. Bypasses all permission checks.",
    level: 100,
    permissions: ALL_PLATFORM_PERMISSIONS,
    builtIn: true,
    scope: "platform",
  },
  gp_support: {
    id: "gp_support",
    label: "Support",
    description: "Read-only access to tenants, billing, and verification. Can view but not modify.",
    level: 50,
    permissions: [
      "platform.dashboard.read",
      "platform.tenants.read",
      "platform.tenants.subscription.read",
      "platform.tenants.members.read",
      "platform.billing.read",
      "platform.plans.read",
      "platform.verification.read",
      "platform.stripe.read",
    ],
    builtIn: true,
    scope: "platform",
  },
  user: {
    id: "user",
    label: "User",
    description: "Standard platform user with no administrative permissions.",
    level: 0,
    permissions: [],
    builtIn: true,
    scope: "platform",
  },
};

// ─── League Role Templates ──────────────────────────────────────────────────

export const LEAGUE_ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  league_owner: {
    id: "league_owner",
    label: LEAGUE_ROLES.league_owner.label,
    description: "Complete league access. Bypasses all permission checks.",
    level: LEAGUE_ROLES.league_owner.level,
    permissions: ALL_LEAGUE_PERMISSIONS,
    builtIn: true,
    scope: "league",
  },
  league_admin: {
    id: "league_admin",
    label: LEAGUE_ROLES.league_admin.label,
    description: "Full operational access. Can manage events, registrations, scoring, and staff. Cannot manage financials or league settings.",
    level: LEAGUE_ROLES.league_admin.level,
    permissions: DEFAULT_LEAGUE_ROLE_PERMISSIONS.league_admin,
    builtIn: true,
    scope: "league",
  },
  league_staff: {
    id: "league_staff",
    label: LEAGUE_ROLES.league_staff.label,
    description: "Day-to-day operations. Can view most features and enter scores.",
    level: LEAGUE_ROLES.league_staff.level,
    permissions: DEFAULT_LEAGUE_ROLE_PERMISSIONS.league_staff,
    builtIn: true,
    scope: "league",
  },
  league_viewer: {
    id: "league_viewer",
    label: LEAGUE_ROLES.league_viewer.label,
    description: "Read-only access to league data.",
    level: LEAGUE_ROLES.league_viewer.level,
    permissions: DEFAULT_LEAGUE_ROLE_PERMISSIONS.league_viewer,
    builtIn: true,
    scope: "league",
  },
};

// ─── Organization Role Templates ────────────────────────────────────────────

export const ORG_ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  org_owner: {
    id: "org_owner",
    label: ORG_ROLES.org_owner.label,
    description: "Complete organization access. Bypasses all permission checks.",
    level: ORG_ROLES.org_owner.level,
    permissions: ALL_ORG_PERMISSIONS,
    builtIn: true,
    scope: "organization",
  },
  org_admin: {
    id: "org_admin",
    label: ORG_ROLES.org_admin.label,
    description: "Full operational access. Can manage roster, staff, payments, and settings.",
    level: ORG_ROLES.org_admin.level,
    permissions: DEFAULT_ORG_ROLE_PERMISSIONS.org_admin,
    builtIn: true,
    scope: "organization",
  },
  head_coach: {
    id: "head_coach",
    label: ORG_ROLES.head_coach.label,
    description: "Manages roster, schedule, stats, and player development. Can invite staff.",
    level: ORG_ROLES.head_coach.level,
    permissions: DEFAULT_ORG_ROLE_PERMISSIONS.head_coach,
    builtIn: true,
    scope: "organization",
  },
  assistant_coach: {
    id: "assistant_coach",
    label: ORG_ROLES.assistant_coach.label,
    description: "Can view roster, manage schedule, enter stats, and mark attendance.",
    level: ORG_ROLES.assistant_coach.level,
    permissions: DEFAULT_ORG_ROLE_PERMISSIONS.assistant_coach,
    builtIn: true,
    scope: "organization",
  },
  team_manager: {
    id: "team_manager",
    label: ORG_ROLES.team_manager.label,
    description: "Handles logistics — schedule, attendance, payments, and uniforms.",
    level: ORG_ROLES.team_manager.level,
    permissions: DEFAULT_ORG_ROLE_PERMISSIONS.team_manager,
    builtIn: true,
    scope: "organization",
  },
  viewer: {
    id: "viewer",
    label: ORG_ROLES.viewer.label,
    description: "Read-only access to organization data.",
    level: ORG_ROLES.viewer.level,
    permissions: DEFAULT_ORG_ROLE_PERMISSIONS.viewer,
    builtIn: true,
    scope: "organization",
  },
};
