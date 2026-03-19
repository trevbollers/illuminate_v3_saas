import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IConfigOption {
  label: string;
  value: string;
  priceModifier: number;
}

export interface IProductConfigOption {
  name: string;
  type: "select" | "range" | "toggle";
  options: IConfigOption[];
  required: boolean;
}

export interface IProductPricing {
  basePrice: number;
  unit: "lb" | "kg" | "each" | "case";
  wholesalePrice?: number;
  bulkPricing: {
    minQty: number;
    pricePerUnit: number;
  }[];
}

// --- Main interface ---

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  category: string;
  subcategory?: string;
  description?: string;
  configurable: boolean;
  configOptions: IProductConfigOption[];
  pricing: IProductPricing;
  recipeId?: Types.ObjectId;
  images: string[];
  tags: string[];
  isActive: boolean;
  availableOnStorefront: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema (exported for tenant-connection registration) ---

export const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    description: { type: String },
    configurable: { type: Boolean, default: false },
    configOptions: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ["select", "range", "toggle"],
          required: true,
        },
        options: [
          {
            label: { type: String, required: true },
            value: { type: String, required: true },
            priceModifier: { type: Number, default: 0 },
          },
        ],
        required: { type: Boolean, default: false },
      },
    ],
    pricing: {
      basePrice: { type: Number, required: true },
      unit: {
        type: String,
        enum: ["lb", "kg", "each", "case"],
        required: true,
      },
      wholesalePrice: { type: Number },
      bulkPricing: [
        {
          minQty: { type: Number, required: true },
          pricePerUnit: { type: Number, required: true },
        },
      ],
    },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    images: [{ type: String }],
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    availableOnStorefront: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes — no tenantId needed (database-per-tenant isolation)
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ availableOnStorefront: 1 });
ProductSchema.index({ createdAt: -1 });

// Default model on default connection (for backwards compat / seed scripts)
export const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);
