import mongoose, { Document, Schema } from "mongoose";

// --- Sub-interfaces ---

export interface IPlanAddOn {
  featureId: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    stripePriceId?: string;
  };
}

export interface IPlanLimits {
  users: number;
  teams: number;
  players: number;
  eventsPerMonth: number;
  storageGb: number;
}

export interface IPlanPricing {
  monthly: number;
  annual: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
}

// --- Main interface ---

export interface IPlan extends Document {
  planId: string;
  name: string;
  description: string;
  scope: "league" | "organization" | "family";
  features: string[];
  limits: IPlanLimits;
  pricing: IPlanPricing;
  addOns: IPlanAddOn[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const PlanSchema = new Schema<IPlan>(
  {
    planId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    scope: {
      type: String,
      enum: ["league", "organization", "family"],
      required: true,
    },
    features: [{ type: String }],
    limits: {
      users: { type: Number, required: true },
      teams: { type: Number, required: true },
      players: { type: Number, required: true },
      eventsPerMonth: { type: Number, required: true },
      storageGb: { type: Number, required: true },
    },
    pricing: {
      monthly: { type: Number, required: true },
      annual: { type: Number, required: true },
      stripePriceIdMonthly: { type: String },
      stripePriceIdAnnual: { type: String },
    },
    addOns: [
      {
        featureId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        pricing: {
          monthly: { type: Number, required: true },
          stripePriceId: { type: String },
        },
      },
    ],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });
PlanSchema.index({ scope: 1 });

export const Plan =
  (mongoose.models.Plan as mongoose.Model<IPlan>) ||
  mongoose.model<IPlan>("Plan", PlanSchema);
