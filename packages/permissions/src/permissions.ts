import type { Role } from "./roles";

// ---------------------------------------------------------------------------
// Permission constants
// ---------------------------------------------------------------------------

// Products
export const PRODUCTS_VIEW = "products.view" as const;
export const PRODUCTS_CREATE = "products.create" as const;
export const PRODUCTS_EDIT = "products.edit" as const;
export const PRODUCTS_DELETE = "products.delete" as const;

// Recipes
export const RECIPES_VIEW = "recipes.view" as const;
export const RECIPES_CREATE = "recipes.create" as const;
export const RECIPES_EDIT = "recipes.edit" as const;
export const RECIPES_DELETE = "recipes.delete" as const;

// Inventory
export const INVENTORY_VIEW = "inventory.view" as const;
export const INVENTORY_ADJUST = "inventory.adjust" as const;
export const INVENTORY_MANAGE = "inventory.manage" as const;

// Purchasing
export const PURCHASING_VIEW = "purchasing.view" as const;
export const PURCHASING_CREATE = "purchasing.create" as const;
export const PURCHASING_APPROVE = "purchasing.approve" as const;

// Sales
export const SALES_VIEW = "sales.view" as const;
export const SALES_CREATE = "sales.create" as const;
export const SALES_MANAGE = "sales.manage" as const;
export const SALES_REFUND = "sales.refund" as const;

// Production
export const PRODUCTION_VIEW = "production.view" as const;
export const PRODUCTION_CREATE = "production.create" as const;
export const PRODUCTION_MANAGE = "production.manage" as const;

// Team
export const TEAM_VIEW = "team.view" as const;
export const TEAM_INVITE = "team.invite" as const;
export const TEAM_MANAGE = "team.manage" as const;

// Settings
export const SETTINGS_VIEW = "settings.view" as const;
export const SETTINGS_BILLING = "settings.billing" as const;
export const SETTINGS_MANAGE = "settings.manage" as const;

// Storefront
export const STOREFRONT_VIEW = "storefront.view" as const;
export const STOREFRONT_MANAGE = "storefront.manage" as const;

// Reports
export const REPORTS_VIEW = "reports.view" as const;
export const REPORTS_EXPORT = "reports.export" as const;

// ---------------------------------------------------------------------------
// All permissions list
// ---------------------------------------------------------------------------

export const ALL_PERMISSIONS = [
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
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// ---------------------------------------------------------------------------
// Permission groups (for UI display)
// ---------------------------------------------------------------------------

export const PERMISSION_GROUPS = {
  Products: [PRODUCTS_VIEW, PRODUCTS_CREATE, PRODUCTS_EDIT, PRODUCTS_DELETE],
  Recipes: [RECIPES_VIEW, RECIPES_CREATE, RECIPES_EDIT, RECIPES_DELETE],
  Inventory: [INVENTORY_VIEW, INVENTORY_ADJUST, INVENTORY_MANAGE],
  Purchasing: [PURCHASING_VIEW, PURCHASING_CREATE, PURCHASING_APPROVE],
  Sales: [SALES_VIEW, SALES_CREATE, SALES_MANAGE, SALES_REFUND],
  Production: [PRODUCTION_VIEW, PRODUCTION_CREATE, PRODUCTION_MANAGE],
  Team: [TEAM_VIEW, TEAM_INVITE, TEAM_MANAGE],
  Settings: [SETTINGS_VIEW, SETTINGS_BILLING, SETTINGS_MANAGE],
  Storefront: [STOREFRONT_VIEW, STOREFRONT_MANAGE],
  Reports: [REPORTS_VIEW, REPORTS_EXPORT],
} as const;

// ---------------------------------------------------------------------------
// Default permissions per role
// ---------------------------------------------------------------------------

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,

  admin: [
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
    STOREFRONT_VIEW,
    STOREFRONT_MANAGE,
    REPORTS_VIEW,
    REPORTS_EXPORT,
  ],

  manager: [
    PRODUCTS_VIEW,
    PRODUCTS_CREATE,
    PRODUCTS_EDIT,
    RECIPES_VIEW,
    RECIPES_CREATE,
    RECIPES_EDIT,
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
    SETTINGS_VIEW,
    STOREFRONT_VIEW,
    STOREFRONT_MANAGE,
    REPORTS_VIEW,
    REPORTS_EXPORT,
  ],

  staff: [
    PRODUCTS_VIEW,
    PRODUCTS_CREATE,
    PRODUCTS_EDIT,
    RECIPES_VIEW,
    RECIPES_CREATE,
    RECIPES_EDIT,
    INVENTORY_VIEW,
    INVENTORY_ADJUST,
    PURCHASING_VIEW,
    PURCHASING_CREATE,
    SALES_VIEW,
    SALES_CREATE,
    PRODUCTION_VIEW,
    PRODUCTION_CREATE,
    TEAM_VIEW,
    SETTINGS_VIEW,
    STOREFRONT_VIEW,
    REPORTS_VIEW,
  ],

  viewer: [
    PRODUCTS_VIEW,
    RECIPES_VIEW,
    INVENTORY_VIEW,
    PURCHASING_VIEW,
    SALES_VIEW,
    PRODUCTION_VIEW,
    TEAM_VIEW,
    SETTINGS_VIEW,
    STOREFRONT_VIEW,
    REPORTS_VIEW,
  ],
} as const;
