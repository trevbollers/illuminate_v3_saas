import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IStanding extends Document {
  eventId: Types.ObjectId;
  divisionId: Types.ObjectId;
  teamId: Types.ObjectId;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  gamesPlayed: number;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const StandingSchema = new Schema<IStanding>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    teamId: { type: Schema.Types.ObjectId, required: true },
    teamName: { type: String, required: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    pointDifferential: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    rank: { type: Number },
  },
  { timestamps: true }
);

StandingSchema.index({ eventId: 1, divisionId: 1, rank: 1 });
