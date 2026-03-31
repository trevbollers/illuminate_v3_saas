import { Schema, Document, Types } from "mongoose";

export interface IFamilyGuardian extends Document {
  userId: Types.ObjectId;          // Platform user ID
  name: string;
  email: string;
  phone?: string;
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other";
  isPrimary: boolean;              // Primary contact for this family
  canMakeDecisions: boolean;       // Can approve grants, manage docs
  playerIds: Types.ObjectId[];     // Which players this guardian is linked to
  createdAt: Date;
  updatedAt: Date;
}

export const FamilyGuardianSchema = new Schema<IFamilyGuardian>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    relationship: {
      type: String,
      enum: ["mother", "father", "guardian", "grandparent", "other"],
      default: "guardian",
    },
    isPrimary: { type: Boolean, default: false },
    canMakeDecisions: { type: Boolean, default: true },
    playerIds: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true },
);

FamilyGuardianSchema.index({ userId: 1 });
FamilyGuardianSchema.index({ email: 1 });
