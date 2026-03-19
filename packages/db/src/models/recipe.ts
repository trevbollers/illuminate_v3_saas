import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IRecipeIngredient {
  ingredientId: Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface IRecipeInstruction {
  step: number;
  description: string;
  duration?: number;
  temperature?: {
    value: number;
    unit: string;
  };
}

export interface IRecipeYield {
  quantity: number;
  unit: string;
}

// --- Main interface ---

export interface IRecipe extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  ingredients: IRecipeIngredient[];
  instructions: IRecipeInstruction[];
  yield: IRecipeYield;
  costPerUnit?: number;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const RecipeSchema = new Schema<IRecipe>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    ingredients: [
      {
        ingredientId: {
          type: Schema.Types.ObjectId,
          ref: "Ingredient",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        notes: { type: String },
      },
    ],
    instructions: [
      {
        step: { type: Number, required: true },
        description: { type: String, required: true },
        duration: { type: Number },
        temperature: {
          value: { type: Number },
          unit: { type: String },
        },
      },
    ],
    yield: {
      quantity: { type: Number },
      unit: { type: String },
    },
    costPerUnit: { type: Number },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
RecipeSchema.index({ tenantId: 1, createdAt: -1 });
RecipeSchema.index({ tenantId: 1, category: 1 });

export const Recipe =
  (mongoose.models.Recipe as mongoose.Model<IRecipe>) ||
  mongoose.model<IRecipe>("Recipe", RecipeSchema);
