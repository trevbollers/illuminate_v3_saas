// ─── Roles ───────────────────────────────────────────────────────────────────

export {
  PLATFORM_ROLES,
  LEAGUE_ROLES,
  ORG_ROLES,
  type PlatformRole,
  type LeagueRole,
  type OrgRole,
  type TenantRole,
  type TenantType,
  getRoleLevel,
  isRoleAtLeast,
  isOwnerRole,
  getLeagueRoleHierarchy,
  getOrgRoleHierarchy,
} from "./roles";

// ─── Permission constants ────────────────────────────────────────────────────

export {
  // League permissions
  EVENTS_VIEW, EVENTS_CREATE, EVENTS_EDIT, EVENTS_DELETE, EVENTS_PUBLISH,
  REGISTRATIONS_VIEW, REGISTRATIONS_MANAGE, REGISTRATIONS_REFUND,
  VERIFICATION_VIEW, VERIFICATION_REVIEW, VERIFICATION_OVERRIDE,
  COMPLIANCE_VIEW, COMPLIANCE_MANAGE,
  BRACKETS_VIEW, BRACKETS_MANAGE,
  SCORING_VIEW, SCORING_ENTER, SCORING_EDIT,
  L_FINANCIALS_VIEW, L_FINANCIALS_MANAGE,
  L_STAFF_VIEW, L_STAFF_INVITE, L_STAFF_MANAGE,
  L_SETTINGS_VIEW, L_SETTINGS_BILLING, L_SETTINGS_MANAGE,
  ALL_LEAGUE_PERMISSIONS,
  type LeaguePermission,
  DEFAULT_LEAGUE_ROLE_PERMISSIONS,

  // Organization permissions
  ROSTER_VIEW, ROSTER_ADD, ROSTER_EDIT, ROSTER_REMOVE,
  SCHEDULE_VIEW, SCHEDULE_CREATE, SCHEDULE_EDIT, SCHEDULE_DELETE,
  COMMS_VIEW, COMMS_SEND, COMMS_MANAGE,
  ATTENDANCE_VIEW, ATTENDANCE_MARK,
  REGISTRATION_VIEW, REGISTRATION_SUBMIT, REGISTRATION_MANAGE,
  PAYMENTS_VIEW, PAYMENTS_COLLECT, PAYMENTS_MANAGE,
  STATS_VIEW, STATS_ENTER, STATS_EDIT,
  DEVELOPMENT_VIEW, DEVELOPMENT_CREATE, DEVELOPMENT_MANAGE,
  UNIFORMS_VIEW, UNIFORMS_INITIATE, UNIFORMS_MANAGE,
  TEAMS_VIEW, TEAMS_CREATE, TEAMS_MANAGE,
  ORG_STAFF_VIEW, ORG_STAFF_INVITE, ORG_STAFF_MANAGE,
  ORG_SETTINGS_VIEW, ORG_SETTINGS_BILLING, ORG_SETTINGS_MANAGE,
  ORG_FINANCIALS_VIEW, ORG_FINANCIALS_MANAGE,
  STOREFRONT_VIEW, STOREFRONT_MANAGE,
  ALL_ORG_PERMISSIONS,
  type OrgPermission,
  DEFAULT_ORG_ROLE_PERMISSIONS,
} from "./permissions";

// ─── Permission checks ──────────────────────────────────────────────────────

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasPlatformPermission,
  hasAnyPlatformPermission,
  hasAllPlatformPermissions,
  getRolePermissions,
} from "./check";

// ─── Permission trees ───────────────────────────────────────────────────────

export type { PermissionTree, PermissionNode, ActionDef } from "./tree";

export { PLATFORM_PERMISSION_TREE } from "./trees/platform";
export { LEAGUE_PERMISSION_TREE } from "./trees/league";
export { ORGANIZATION_PERMISSION_TREE } from "./trees/organization";

export {
  flattenTree,
  flattenTreeToArray,
  buildImpliesMap,
  expandImplied,
  getNodeByKey,
  getAllActions,
  hasPermissionInTree,
} from "./tree-utils";

// ─── Role templates ─────────────────────────────────────────────────────────

export {
  type RoleTemplate,
  PLATFORM_ROLE_TEMPLATES,
  LEAGUE_ROLE_TEMPLATES,
  ORG_ROLE_TEMPLATES,
} from "./role-templates";

// ─── Feature flags ──────────────────────────────────────────────────────────

export {
  isFeatureEnabled,
  type FeatureFlag,
  type FeatureFlagContext,
} from "./feature-flags";
