import { Schema, Document, Types } from "mongoose";

export interface IPlayerSizing {
  top?: string;
  bottom?: string;
  shoe?: string;
  headgear?: string;
}

export interface IPlayerEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface IPlayerMedical {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
}

export interface IPlayerPhoto {
  url: string;
  season: string;           // "2025-2026"
  year: number;             // 2025
  uploadedAt: Date;
  isCurrent: boolean;
}

export interface IPlayerSportProfile {
  sport: string;            // "basketball", "7v7_football"
  positions: string[];      // ["PG", "SG"] or ["QB", "WR"]
  startedYear?: number;     // Year they started playing this sport
  preferredFoot?: "left" | "right" | "both";
  preferredHand?: "left" | "right" | "both";
}

export interface IFamilyPlayer extends Document {
  /**
   * Pointer to the canonical platform `Player` record that carries this
   * child's cross-tenant identity. Created during the first team invite
   * accept (see apps/web/src/app/api/family/invites/[token]/accept).
   * Rosters on org tenants reference this id — NOT the FamilyPlayer._id —
   * so that resolveRecipients can walk Roster → Player.guardianUserIds
   * to reach parents for email/SMS delivery.
   */
  platformPlayerId?: Types.ObjectId;

  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";

  // Photos — yearly verification photo
  photos: IPlayerPhoto[];
  currentPhotoUrl?: string;

  // Physical
  sizing: IPlayerSizing;
  heightInches?: number;
  weightLbs?: number;

  // Medical & emergency
  emergencyContacts: IPlayerEmergencyContact[];
  medical: IPlayerMedical;

  // Sports
  sports: IPlayerSportProfile[];

  // Team history (denormalized for fast family dashboard)
  teamHistory: {
    tenantSlug: string;
    tenantName: string;
    teamName: string;
    teamId: string;
    sport: string;
    season: string;
    year: number;
    role?: string;           // "player", "captain"
    jerseyNumber?: string;
    joinedAt: Date;
    leftAt?: Date;
    stats?: {
      gamesPlayed?: number;
      attendanceRate?: number;
    };
  }[];

  // Verification
  verificationStatus: "unverified" | "pending" | "verified" | "expired";

  // Socials
  socials: {
    instagram?: string;
    tiktok?: string;
    hudl?: string;
    youtube?: string;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const FamilyPlayerSchema = new Schema<IFamilyPlayer>(
  {
    platformPlayerId: { type: Schema.Types.ObjectId },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },

    photos: [{
      url: { type: String, required: true },
      season: { type: String },
      year: { type: Number },
      uploadedAt: { type: Date, default: Date.now },
      isCurrent: { type: Boolean, default: false },
    }],
    currentPhotoUrl: { type: String },

    sizing: {
      top: { type: String },
      bottom: { type: String },
      shoe: { type: String },
      headgear: { type: String },
    },
    heightInches: { type: Number },
    weightLbs: { type: Number },

    emergencyContacts: [{
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phone: { type: String, required: true },
    }],
    medical: {
      allergies: { type: String },
      medications: { type: String },
      conditions: { type: String },
      notes: { type: String },
      insuranceProvider: { type: String },
      insurancePolicyNumber: { type: String },
    },

    sports: [{
      sport: { type: String, required: true },
      positions: [{ type: String }],
      startedYear: { type: Number },
      preferredFoot: { type: String, enum: ["left", "right", "both"] },
      preferredHand: { type: String, enum: ["left", "right", "both"] },
    }],

    teamHistory: [{
      tenantSlug: { type: String },
      tenantName: { type: String },
      teamName: { type: String },
      teamId: { type: String },
      sport: { type: String },
      season: { type: String },
      year: { type: Number },
      role: { type: String },
      jerseyNumber: { type: String },
      joinedAt: { type: Date },
      leftAt: { type: Date },
      stats: {
        gamesPlayed: { type: Number },
        attendanceRate: { type: Number },
      },
    }],

    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "expired"],
      default: "unverified",
    },

    socials: {
      instagram: { type: String },
      tiktok: { type: String },
      hudl: { type: String },
      youtube: { type: String },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

FamilyPlayerSchema.index({ firstName: 1, lastName: 1 });
FamilyPlayerSchema.index({ verificationStatus: 1 });
