import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IWaiver extends Document {
  complianceRuleId: Types.ObjectId;
  signedBy: Types.ObjectId;
  signedForPlayerId?: Types.ObjectId;
  signatureData: string;
  signedAt: Date;
  expiresAt?: Date;
  status: "active" | "expired" | "revoked";
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const WaiverSchema = new Schema<IWaiver>(
  {
    complianceRuleId: { type: Schema.Types.ObjectId, ref: "ComplianceRule", required: true },
    signedBy: { type: Schema.Types.ObjectId, required: true },
    signedForPlayerId: { type: Schema.Types.ObjectId },
    signatureData: { type: String, required: true },
    signedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
  },
  { timestamps: true }
);

WaiverSchema.index({ complianceRuleId: 1 });
WaiverSchema.index({ signedBy: 1 });
WaiverSchema.index({ signedForPlayerId: 1 });
