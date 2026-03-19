export { ROLES, type Role, type RoleInfo, getRoleHierarchy, isRoleAtLeast } from "./roles";

export {
  // Permission constants
  PRODUCTS_VIEW,
  PRODUCTS_CREATE,
  PRODUCTS_EDIT,
  PRODUCTS_DELETE,
  RECIPES_VIEW,
  RECIPES_CREATE,
  RECIPES_EDIT,
  RECIPES_DELETE,
  INVENTORY_VIEW,
  INVENTORY_ADJUST,
  INVENTORY_MANAGE,
  PURCHASING_VIEW,
  PURCHASING_CREATE,
  PURCHASING_APPROVE,
  SALES_VIEW,
  SALES_CREATE,
  SALES_MANAGE,
  SALES_REFUND,
  PRODUCTION_VIEW,
  PRODUCTION_CREATE,
  PRODUCTION_MANAGE,
  TEAM_VIEW,
  TEAM_INVITE,
  TEAM_MANAGE,
  SETTINGS_VIEW,
  SETTINGS_BILLING,
  SETTINGS_MANAGE,
  STOREFRONT_VIEW,
  STOREFRONT_MANAGE,
  REPORTS_VIEW,
  REPORTS_EXPORT,
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "./permissions";

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
} from "./check";

export {
  isFeatureEnabled,
  type FeatureFlag,
  type FeatureFlagContext,
} from "./feature-flags";
