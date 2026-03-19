import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IBatchIngredient {
  ingredientId: Types.ObjectId;
  planned: number;
  actual?: number;
  unit: string;
}

export interface IBatchTemperature {
  min?: number;
  max?: number;
  unit?: string;
}

// --- Main interface ---

export interface IProductionBatch extends Document {
  locationId: Types.ObjectId;
  batchNumber: string;
  recipeId: Types.ObjectId;
  productId: Types.ObjectId;
  plannedQuantity: number;
  actualQuantity?: number;
  unit: string;
  ingredientsUsed: IBatchIngredient[];
  status: "planned" | "in_progress" | "completed" | "canceled";
  startedAt?: Date;
  completedAt?: Date;
  qualityNotes?: string;
  temperature?: IBatchTemperature;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema (exported for tenant-connection registration) ---

export const ProductionBatchSchema = new Schema<IProductionBatch>(
  {
    locationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    batchNumber: { type: String, required: true },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    plannedQuantity: { type: Number, required: true },
    actualQuantity: { type: Number },
    unit: { type: String, required: true },
    ingredientsUsed: [
      {
        ingredientId: {
          type: Schema.Types.ObjectId,
          ref: "Ingredient",
          required: true,
        },
        planned: { type: Number, required: true },
        actual: { type: Number },
        unit: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "canceled"],
      default: "planned",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    qualityNotes: { type: String },
    temperature: {
      min: { type: Number },
      max: { type: Number },
      unit: { type: String },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
ProductionBatchSchema.index({ batchNumber: 1 }, { unique: true });
ProductionBatchSchema.index({ status: 1, createdAt: -1 });
ProductionBatchSchema.index({ recipeId: 1 });
ProductionBatchSchema.index({ createdAt: -1 });

export const ProductionBatch =
  (mongoose.models.ProductionBatch as mongoose.Model<IProductionBatch>) ||
  mongoose.model<IProductionBatch>("ProductionBatch", ProductionBatchSchema);
