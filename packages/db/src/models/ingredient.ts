import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IIngredientCost {
  perUnit: number;
  lastUpdated?: Date;
  supplier?: Types.ObjectId;
}

export interface IShelfLife {
  value: number;
  unit: string;
}

// --- Main interface ---

export interface IIngredient extends Document {
  tenantId: Types.ObjectId;
  name: string;
  sku: string;
  category: "meat" | "spice" | "casing" | "packaging" | "other";
  unit: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  cost: IIngredientCost;
  allergens: string[];
  shelfLife?: IShelfLife;
  storageRequirements?: "refrigerated" | "frozen" | "dry";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const IngredientSchema = new Schema<IIngredient>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    category: {
      type: String,
      enum: ["meat", "spice", "casing", "packaging", "other"],
      required: true,
    },
    unit: { type: String, required: true },
    currentStock: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    cost: {
      perUnit: { type: Number, default: 0 },
      lastUpdated: { type: Date },
      supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    },
    allergens: [{ type: String }],
    shelfLife: {
      value: { type: Number },
      unit: { type: String },
    },
    storageRequirements: {
      type: String,
      enum: ["refrigerated", "frozen", "dry"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
IngredientSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
IngredientSchema.index({ tenantId: 1, currentStock: 1, reorderPoint: 1 });
IngredientSchema.index({ tenantId: 1, category: 1 });
IngredientSchema.index({ tenantId: 1, createdAt: -1 });

export const Ingredient =
  (mongoose.models.Ingredient as mongoose.Model<IIngredient>) ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);
