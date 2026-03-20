import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IRollout {
  type: "all" | "percentage" | "tenant_list" | "plan_based";
  percentage?: number;
  tenantIds?: Types.ObjectId[];
  plans?: string[];
}

// --- Main interface ---

export interface IFeatureFlag extends Document {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout: IRollout;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: false },
    rollout: {
      type: {
        type: String,
        enum: ["all", "percentage", "tenant_list", "plan_based"],
        default: "all",
      },
      percentage: { type: Number, min: 0, max: 100 },
      tenantIds: [{ type: Schema.Types.ObjectId, ref: "Tenant" }],
      plans: [{ type: String }],
    },
  },
  { timestamps: true }
);

// Indexes (key unique index is defined on the field above)
FeatureFlagSchema.index({ enabled: 1 });

export const FeatureFlag =
  (mongoose.models.FeatureFlag as mongoose.Model<IFeatureFlag>) ||
  mongoose.model<IFeatureFlag>("FeatureFlag", FeatureFlagSchema);
