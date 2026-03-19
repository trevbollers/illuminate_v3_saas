// --- Platform-level models (live in the platform database) ---

export { Tenant } from "./tenant";
export type { ITenant, ILocation, ITenantPlan, ITenantPlanAddOn, ITenantSettings } from "./tenant";

export { User } from "./user";
export type { IUser, IMembership } from "./user";

export { Plan } from "./plan";
export type { IPlan, IPlanAddOn, IPlanLimits, IPlanPricing } from "./plan";

export { FeatureFlag } from "./feature-flag";
export type { IFeatureFlag, IRollout } from "./feature-flag";

// --- Tenant-scoped models (live in per-tenant databases) ---
// These default exports use the default mongoose connection and are available
// for seed scripts and backwards compat. In production, use getTenantModels()
// with a tenant-specific connection instead.

export { Product, ProductSchema } from "./product";
export type { IProduct, IProductConfigOption, IConfigOption, IProductPricing } from "./product";

export { Recipe, RecipeSchema } from "./recipe";
export type { IRecipe, IRecipeIngredient, IRecipeInstruction, IRecipeYield } from "./recipe";

export { Ingredient, IngredientSchema } from "./ingredient";
export type { IIngredient, IIngredientCost, IShelfLife } from "./ingredient";

export { InventoryTransaction, InventoryTransactionSchema } from "./inventory-transaction";
export type { IInventoryTransaction, ITransactionReference } from "./inventory-transaction";

export { Supplier, SupplierSchema } from "./supplier";
export type { ISupplier, ISupplierAddress } from "./supplier";

export { PurchaseOrder, PurchaseOrderSchema } from "./purchase-order";
export type { IPurchaseOrder, IPurchaseOrderItem } from "./purchase-order";

export { SalesOrder, SalesOrderSchema } from "./sales-order";
export type { ISalesOrder, ISalesOrderCustomer, ISalesOrderItem, ISalesOrderDiscount } from "./sales-order";

export { ProductionBatch, ProductionBatchSchema } from "./production-batch";
export type { IProductionBatch, IBatchIngredient, IBatchTemperature } from "./production-batch";

// --- Tenant model helpers ---

export { registerTenantModels, getTenantModels } from "./tenant-models";
