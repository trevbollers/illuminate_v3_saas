import mongoose, { Document, Schema, Types } from "mongoose";

// --- Main interface ---

export interface IVerification extends Document {
  playerId: Types.ObjectId;
  documentType: "birth_certificate" | "passport" | "school_id" | "other";
  documentUrl: string;
  dateOfBirthOnDoc: Date;
  status: "pending" | "approved" | "rejected" | "expired";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  expiresAt?: Date;
  submittedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const VerificationSchema = new Schema<IVerification>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    documentType: {
      type: String,
      enum: ["birth_certificate", "passport", "school_id", "other"],
      required: true,
    },
    documentUrl: { type: String, required: true },
    dateOfBirthOnDoc: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    expiresAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

VerificationSchema.index({ playerId: 1 });
VerificationSchema.index({ status: 1 });

export const Verification =
  (mongoose.models.Verification as mongoose.Model<IVerification>) ||
  mongoose.model<IVerification>("Verification", VerificationSchema);
