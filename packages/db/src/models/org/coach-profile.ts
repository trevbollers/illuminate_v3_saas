import { Schema, Document, Types } from "mongoose";

export interface ICoachProfile extends Document {
  userId: Types.ObjectId;
  name: string;
  photoUrl?: string;
  bio?: string;
  role: "head_coach" | "assistant_coach" | "team_manager";
  teamIds: Types.ObjectId[];

  // Contact — shared with org
  email?: string;
  phone?: string;
  socials: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    linkedin?: string;
  };

  // Credentials
  certifications?: string[];   // "First Aid", "CPR", "USSSA Certified", etc.
  yearsExperience?: number;

  // Badges & awards (future — org-provided)
  badges: {
    label: string;
    icon?: string;             // emoji or icon key
    awardedAt: Date;
    awardedBy?: Types.ObjectId;
    eventId?: Types.ObjectId;  // linked to specific event
    description?: string;
  }[];

  // QR check-in code (unique per coach per org)
  checkInCode: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CoachProfileSchema = new Schema<ICoachProfile>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    photoUrl: { type: String },
    bio: { type: String },
    role: {
      type: String,
      enum: ["head_coach", "assistant_coach", "team_manager"],
      required: true,
    },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    email: { type: String },
    phone: { type: String },
    socials: {
      instagram: { type: String },
      twitter: { type: String },
      tiktok: { type: String },
      facebook: { type: String },
      linkedin: { type: String },
    },
    certifications: [{ type: String }],
    yearsExperience: { type: Number },
    badges: [
      {
        label: { type: String, required: true },
        icon: { type: String },
        awardedAt: { type: Date, default: Date.now },
        awardedBy: { type: Schema.Types.ObjectId },
        eventId: { type: Schema.Types.ObjectId },
        description: { type: String },
        _id: false,
      },
    ],
    checkInCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CoachProfileSchema.index({ userId: 1 });
CoachProfileSchema.index({ checkInCode: 1 });
CoachProfileSchema.index({ teamIds: 1 });
