import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IComplianceRule extends Document {
  name: string;
  type: "coach_certification" | "waiver" | "medical_form" | "background_check" | "other";
  description?: string;
  required: boolean;
  appliesToRole: "all" | "coach" | "player" | "parent";
  templateUrl?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const ComplianceRuleSchema = new Schema<IComplianceRule>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["coach_certification", "waiver", "medical_form", "background_check", "other"],
      required: true,
    },
    description: { type: String },
    required: { type: Boolean, default: true },
    appliesToRole: {
      type: String,
      enum: ["all", "coach", "player", "parent"],
      default: "all",
    },
    templateUrl: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

ComplianceRuleSchema.index({ type: 1, isActive: 1 });
