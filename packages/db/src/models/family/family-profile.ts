import { Schema, Document, Types } from "mongoose";

export interface IFamilyAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface IFamilyProfile extends Document {
  familyName: string;              // "The Johnson Family"
  primaryUserId: Types.ObjectId;   // The user who created the family (platform user ID)
  address?: IFamilyAddress;

  // Connections — which orgs and leagues this family is part of
  orgConnections: {
    tenantSlug: string;
    tenantName: string;
    connectedAt: Date;
    status: "active" | "inactive";
  }[];
  leagueConnections: {
    tenantSlug: string;
    tenantName: string;
    connectedAt: Date;
    status: "active" | "inactive";
  }[];

  // Program participation history (camps, tryouts, tournaments, etc.)
  programHistory: {
    tenantSlug: string;
    tenantName: string;
    programName: string;
    programType: string;
    sport: string;
    season?: string;
    year: number;
    playerId: Types.ObjectId;
    playerName: string;
    registeredAt: Date;
  }[];

  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    shareVerificationAcrossLeagues: boolean; // Auto-share verified status
  };

  createdAt: Date;
  updatedAt: Date;
}

export const FamilyProfileSchema = new Schema<IFamilyProfile>(
  {
    familyName: { type: String, required: true },
    primaryUserId: { type: Schema.Types.ObjectId, required: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String, default: "US" },
    },
    orgConnections: [{
      tenantSlug: { type: String, required: true },
      tenantName: { type: String },
      connectedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["active", "inactive"], default: "active" },
    }],
    leagueConnections: [{
      tenantSlug: { type: String, required: true },
      tenantName: { type: String },
      connectedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["active", "inactive"], default: "active" },
    }],
    programHistory: [{
      tenantSlug: { type: String },
      tenantName: { type: String },
      programName: { type: String },
      programType: { type: String },
      sport: { type: String },
      season: { type: String },
      year: { type: Number },
      playerId: { type: Schema.Types.ObjectId },
      playerName: { type: String },
      registeredAt: { type: Date },
    }],
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      shareVerificationAcrossLeagues: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
