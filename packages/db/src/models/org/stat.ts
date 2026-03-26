import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IStat extends Document {
  gameId: Types.ObjectId;
  teamId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName: string;
  sport: string;
  data: Record<string, number>;
  enteredBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const StatSchema = new Schema<IStat>(
  {
    gameId: { type: Schema.Types.ObjectId, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    sport: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
    enteredBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

StatSchema.index({ gameId: 1 });
StatSchema.index({ playerId: 1 });
StatSchema.index({ teamId: 1 });
