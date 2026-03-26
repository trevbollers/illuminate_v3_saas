import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IMedicalInfo {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
}

// --- Main interface ---

export interface IPlayer extends Document {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: "male" | "female" | "other";
  photo?: string;
  familyId: Types.ObjectId;
  guardianUserIds: Types.ObjectId[];
  emergencyContacts: IEmergencyContact[];
  medical: IMedicalInfo;
  verificationStatus: "unverified" | "pending" | "verified" | "expired";
  verificationId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const PlayerSchema = new Schema<IPlayer>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    photo: { type: String },
    familyId: { type: Schema.Types.ObjectId, ref: "Family", required: true },
    guardianUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    emergencyContacts: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    medical: {
      allergies: { type: String },
      medications: { type: String },
      conditions: { type: String },
      notes: { type: String },
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "expired"],
      default: "unverified",
    },
    verificationId: { type: Schema.Types.ObjectId, ref: "Verification" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlayerSchema.index({ familyId: 1 });
PlayerSchema.index({ guardianUserIds: 1 });
PlayerSchema.index({ verificationStatus: 1 });
PlayerSchema.index({ lastName: 1, firstName: 1 });

export const Player =
  (mongoose.models.Player as mongoose.Model<IPlayer>) ||
  mongoose.model<IPlayer>("Player", PlayerSchema);
