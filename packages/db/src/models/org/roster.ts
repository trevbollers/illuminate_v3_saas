import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IRoster extends Document {
  teamId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  season?: string;
  status: "active" | "inactive" | "injured" | "suspended";
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const RosterSchema = new Schema<IRoster>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    jerseyNumber: { type: Number },
    position: { type: String },
    season: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "injured", "suspended"],
      default: "active",
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { timestamps: true }
);

RosterSchema.index({ teamId: 1, status: 1 });
RosterSchema.index({ playerId: 1 });
