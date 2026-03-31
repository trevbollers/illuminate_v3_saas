import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IMedicalInfo {
  notes?: string;
}

export interface ISizing {
  top?: string;       // "YS", "YM", "YL", "AS", "AM", "AL", "AXL", "A2XL"
  bottom?: string;    // "YS", "YM", "YL", "AS", "AM", "AL", "AXL", "A2XL"
  shoe?: string;      // "4", "4.5", "5", ..., "13", "14"
  headgear?: string;  // "YS", "YM", "YL", "AS", "AM", "AL"
}

export interface ISocials {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  snapchat?: string;
  youtube?: string;
  hudl?: string;
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
  sizing: ISizing;
  socials: ISocials;
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
      notes: { type: String },
    },
    sizing: {
      top: { type: String },
      bottom: { type: String },
      shoe: { type: String },
      headgear: { type: String },
    },
    socials: {
      instagram: { type: String },
      tiktok: { type: String },
      twitter: { type: String },
      snapchat: { type: String },
      youtube: { type: String },
      hudl: { type: String },
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
