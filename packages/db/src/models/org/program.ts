import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IProgramSession {
  label: string;        // "Day 1", "Week 3", "Session A"
  date: Date;
  startTime?: string;   // "09:00"
  endTime?: string;     // "12:00"
  location?: string;
}

export interface IProgramAgeGroup {
  label: string;        // "12U Boys", "14U Girls"
  gender?: "boys" | "girls" | "coed";
  minAge?: number;
  maxAge?: number;
  capacity?: number;
  registeredCount?: number;
}

// --- Main interface ---

export type ProgramType =
  | "camp"
  | "clinic"
  | "training"
  | "tryout"
  | "tournament"
  | "league_season"
  | "class"
  | "combine"
  | "showcase";

export interface IProgram extends Document {
  name: string;
  slug: string;
  description: string;
  programType: ProgramType;
  sport: string;
  imageUrl?: string;
  bannerUrl?: string;

  // Dates
  startDate: Date;
  endDate?: Date;
  sessions: IProgramSession[];

  // Registration
  fee: number;                    // In cents
  earlyBirdFee?: number;          // Discounted price
  earlyBirdDeadline?: Date;
  registrationDeadline?: Date;
  registrationOpen: boolean;
  capacity?: number;              // Total across all age groups
  ageGroups: IProgramAgeGroup[];

  // Location
  location?: string;
  address?: string;
  city?: string;
  state?: string;

  // Visibility
  isPublic: boolean;              // Show on public page
  isActive: boolean;
  status: "draft" | "registration_open" | "registration_closed" | "in_progress" | "completed" | "canceled";

  // League link (for tournaments/league seasons created by a league)
  leagueEventId?: string;         // References league DB event ID
  leagueSlug?: string;            // Which league this tournament belongs to

  // Metadata
  teamIds: Types.ObjectId[];      // Which teams this is for (empty = all/open)
  tags: string[];                 // "elite", "beginner", "girls-only", etc.
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const ProgramSchema = new Schema<IProgram>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    programType: {
      type: String,
      enum: ["camp", "clinic", "training", "tryout", "tournament", "league_season", "class", "combine", "showcase"],
      required: true,
    },
    sport: { type: String, required: true },
    imageUrl: { type: String },
    bannerUrl: { type: String },

    startDate: { type: Date, required: true },
    endDate: { type: Date },
    sessions: [{
      label: { type: String },
      date: { type: Date },
      startTime: { type: String },
      endTime: { type: String },
      location: { type: String },
    }],

    fee: { type: Number, required: true, default: 0 },
    earlyBirdFee: { type: Number },
    earlyBirdDeadline: { type: Date },
    registrationDeadline: { type: Date },
    registrationOpen: { type: Boolean, default: false },
    capacity: { type: Number },
    ageGroups: [{
      label: { type: String, required: true },
      gender: { type: String, enum: ["boys", "girls", "coed"] },
      minAge: { type: Number },
      maxAge: { type: Number },
      capacity: { type: Number },
      registeredCount: { type: Number, default: 0 },
    }],

    location: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },

    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "registration_open", "registration_closed", "in_progress", "completed", "canceled"],
      default: "draft",
    },

    leagueEventId: { type: String },
    leagueSlug: { type: String },

    teamIds: [{ type: Schema.Types.ObjectId }],
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

ProgramSchema.index({ slug: 1 }, { unique: true });
ProgramSchema.index({ programType: 1, isActive: 1 });
ProgramSchema.index({ isPublic: 1, status: 1, startDate: 1 });
ProgramSchema.index({ sport: 1, programType: 1 });
