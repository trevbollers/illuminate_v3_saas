import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IProductOption {
  label: string;
  values: string[];
  priceAdjustments?: { value: string; amount: number }[];
}

export interface IProductPricing {
  amount: number;
  /** "one_time" for gear/donations, "recurring" for dues/subscriptions */
  type: "one_time" | "recurring";
  /** Recurring interval — only for type=recurring */
  interval?: "weekly" | "monthly" | "quarterly" | "seasonal";
  /** Allow partial / installment payments */
  allowPartialPayment?: boolean;
  installmentCount?: number;
}

// --- Main interface ---

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  category:
    | "fan_gear"
    | "uniforms"
    | "season_dues"
    | "monthly_dues"
    | "training"
    | "donations"
    | "other";
  imageUrl?: string;
  pricing: IProductPricing;
  options: IProductOption[];
  /** Which teams this product is available to (empty = all teams) */
  teamIds: Types.ObjectId[];
  isActive: boolean;
  sortOrder: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: [
        "fan_gear",
        "uniforms",
        "season_dues",
        "monthly_dues",
        "training",
        "donations",
        "other",
      ],
      required: true,
    },
    imageUrl: { type: String },
    pricing: {
      amount: { type: Number, required: true },
      type: { type: String, enum: ["one_time", "recurring"], default: "one_time" },
      interval: { type: String, enum: ["weekly", "monthly", "quarterly", "seasonal"] },
      allowPartialPayment: { type: Boolean, default: false },
      installmentCount: { type: Number },
    },
    options: [
      {
        label: { type: String, required: true },
        values: [{ type: String }],
        priceAdjustments: [
          {
            value: { type: String },
            amount: { type: Number },
          },
        ],
      },
    ],
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ isActive: 1, sortOrder: 1 });
