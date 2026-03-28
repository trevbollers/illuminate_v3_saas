import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface ITeamSocials {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  snapchat?: string;
  youtube?: string;
}

export interface ITeam extends Document {
  name: string;
  divisionKey: string;
  sport: string;
  season?: string;
  headCoachId?: Types.ObjectId;
  coachIds: Types.ObjectId[];
  managerIds: Types.ObjectId[];
  socials: ITeamSocials;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    divisionKey: { type: String, required: true },
    sport: { type: String, required: true },
    season: { type: String },
    headCoachId: { type: Schema.Types.ObjectId },
    coachIds: [{ type: Schema.Types.ObjectId }],
    managerIds: [{ type: Schema.Types.ObjectId }],
    socials: {
      instagram: { type: String },
      tiktok: { type: String },
      twitter: { type: String },
      snapchat: { type: String },
      youtube: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TeamSchema.index({ divisionKey: 1, isActive: 1 });
