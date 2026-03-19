import { Connection } from "mongoose";
import { ProductSchema, type IProduct } from "./product";
import { RecipeSchema, type IRecipe } from "./recipe";
import { IngredientSchema, type IIngredient } from "./ingredient";
import { InventoryTransactionSchema, type IInventoryTransaction } from "./inventory-transaction";
import { SupplierSchema, type ISupplier } from "./supplier";
import { PurchaseOrderSchema, type IPurchaseOrder } from "./purchase-order";
import { SalesOrderSchema, type ISalesOrder } from "./sales-order";
import { ProductionBatchSchema, type IProductionBatch } from "./production-batch";

/**
 * Register all tenant-scoped models on a specific Mongoose connection.
 *
 * Because each tenant has its own database, these models do NOT include a
 * `tenantId` field. Data isolation is enforced at the database/connection level,
 * not the document level.
 *
 * Call this once per tenant connection — it's idempotent (skips if already
 * registered).
 */
export function registerTenantModels(conn: Connection): void {
  if (!conn.models.Product) {
    conn.model<IProduct>("Product", ProductSchema);
  }
  if (!conn.models.Recipe) {
    conn.model<IRecipe>("Recipe", RecipeSchema);
  }
  if (!conn.models.Ingredient) {
    conn.model<IIngredient>("Ingredient", IngredientSchema);
  }
  if (!conn.models.InventoryTransaction) {
    conn.model<IInventoryTransaction>("InventoryTransaction", InventoryTransactionSchema);
  }
  if (!conn.models.Supplier) {
    conn.model<ISupplier>("Supplier", SupplierSchema);
  }
  if (!conn.models.PurchaseOrder) {
    conn.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
  }
  if (!conn.models.SalesOrder) {
    conn.model<ISalesOrder>("SalesOrder", SalesOrderSchema);
  }
  if (!conn.models.ProductionBatch) {
    conn.model<IProductionBatch>("ProductionBatch", ProductionBatchSchema);
  }
}

/**
 * Helper to get typed models from a tenant connection.
 *
 * Usage:
 * ```ts
 * const tenantConn = await connectTenantDB("acme-meat-co");
 * const models = getTenantModels(tenantConn);
 * const products = await models.Product.find({ isActive: true });
 * ```
 */
export function getTenantModels(conn: Connection) {
  return {
    Product: conn.model<IProduct>("Product"),
    Recipe: conn.model<IRecipe>("Recipe"),
    Ingredient: conn.model<IIngredient>("Ingredient"),
    InventoryTransaction: conn.model<IInventoryTransaction>("InventoryTransaction"),
    Supplier: conn.model<ISupplier>("Supplier"),
    PurchaseOrder: conn.model<IPurchaseOrder>("PurchaseOrder"),
    SalesOrder: conn.model<ISalesOrder>("SalesOrder"),
    ProductionBatch: conn.model<IProductionBatch>("ProductionBatch"),
  };
}
