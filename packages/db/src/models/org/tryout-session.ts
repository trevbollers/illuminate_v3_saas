import { Schema, Document, Types } from "mongoose";

export interface IScoringCategory {
  key: string;
  label: string;
  maxScore: number;
}

export interface ITryoutSession extends Document {
  programId: Types.ObjectId;
  name: string;
  sport: string;
  season: string;
  ageGroups: string[];
  dates: Date[];
  evaluatorIds: Types.ObjectId[];
  status: "registration" | "active" | "decision" | "closed";
  scoringCategories: IScoringCategory[];
  historicalBonusWeight: number;
  nextTryoutNumber: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const TryoutSessionSchema = new Schema<ITryoutSession>(
  {
    programId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    sport: { type: String, required: true },
    season: { type: String, required: true },
    ageGroups: [{ type: String }],
    dates: [{ type: Date }],
    evaluatorIds: [{ type: Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["registration", "active", "decision", "closed"],
      default: "registration",
    },
    scoringCategories: [{
      key: { type: String, required: true },
      label: { type: String, required: true },
      maxScore: { type: Number, default: 10 },
    }],
    historicalBonusWeight: { type: Number, default: 0.1, min: 0, max: 1 },
    nextTryoutNumber: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

TryoutSessionSchema.index({ programId: 1 });
TryoutSessionSchema.index({ status: 1 });
