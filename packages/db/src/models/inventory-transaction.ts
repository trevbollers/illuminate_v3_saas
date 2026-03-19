import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ITransactionReference {
  type: "purchase_order" | "production_batch" | "manual";
  id?: Types.ObjectId;
}

// --- Main interface ---

export interface IInventoryTransaction extends Document {
  tenantId: Types.ObjectId;
  locationId: Types.ObjectId;
  ingredientId: Types.ObjectId;
  type: "receiving" | "production_use" | "adjustment" | "waste" | "transfer";
  quantity: number;
  unit: string;
  reference?: ITransactionReference;
  notes?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
}

// --- Schema ---

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    type: {
      type: String,
      enum: ["receiving", "production_use", "adjustment", "waste", "transfer"],
      required: true,
    },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    reference: {
      type: {
        type: String,
        enum: ["purchase_order", "production_batch", "manual"],
      },
      id: { type: Schema.Types.ObjectId },
    },
    notes: { type: String },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes
InventoryTransactionSchema.index({
  tenantId: 1,
  ingredientId: 1,
  createdAt: -1,
});
InventoryTransactionSchema.index({
  tenantId: 1,
  locationId: 1,
  type: 1,
});
InventoryTransactionSchema.index({ tenantId: 1, createdAt: -1 });

export const InventoryTransaction =
  (mongoose.models
    .InventoryTransaction as mongoose.Model<IInventoryTransaction>) ||
  mongoose.model<IInventoryTransaction>(
    "InventoryTransaction",
    InventoryTransactionSchema
  );
