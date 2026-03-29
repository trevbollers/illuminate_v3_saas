import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IBracketMatch {
  matchNumber: number;
  round: number;
  roundLabel?: string; // "Round of 16", "Quarterfinals", "Semifinals", "Championship"
  position: number; // position within the round (0-indexed, top to bottom)
  nextMatchNumber?: number; // winner advances to this match
  nextSlot?: "home" | "away"; // which slot the winner fills in the next match
  homeTeamId?: Types.ObjectId;
  awayTeamId?: Types.ObjectId;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: Types.ObjectId;
  winnerName?: string;
  isBye?: boolean; // true if one team gets a bye (auto-advance)
  gameId?: Types.ObjectId;
  scheduledAt?: Date;
  field?: string;
  status: "scheduled" | "in_progress" | "completed" | "canceled";
}

// --- Main interface ---

export interface IBracket extends Document {
  eventId: Types.ObjectId;
  divisionId: Types.ObjectId;
  name: string;
  type: "single_elimination" | "double_elimination" | "consolation" | "round_robin" | "pool_play";
  matches: IBracketMatch[];
  poolCount?: number;
  status: "draft" | "published" | "in_progress" | "completed";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const BracketSchema = new Schema<IBracket>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["single_elimination", "double_elimination", "consolation", "round_robin", "pool_play"],
      required: true,
    },
    matches: [
      {
        matchNumber: { type: Number, required: true },
        round: { type: Number, required: true },
        roundLabel: { type: String },
        position: { type: Number, default: 0 },
        nextMatchNumber: { type: Number },
        nextSlot: { type: String, enum: ["home", "away"] },
        homeTeamId: { type: Schema.Types.ObjectId },
        awayTeamId: { type: Schema.Types.ObjectId },
        homeTeamName: { type: String },
        awayTeamName: { type: String },
        homeScore: { type: Number },
        awayScore: { type: Number },
        winnerId: { type: Schema.Types.ObjectId },
        winnerName: { type: String },
        isBye: { type: Boolean, default: false },
        gameId: { type: Schema.Types.ObjectId, ref: "Game" },
        scheduledAt: { type: Date },
        field: { type: String },
        status: {
          type: String,
          enum: ["scheduled", "in_progress", "completed", "canceled"],
          default: "scheduled",
        },
      },
    ],
    poolCount: { type: Number },
    status: {
      type: String,
      enum: ["draft", "published", "in_progress", "completed"],
      default: "draft",
    },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

BracketSchema.index({ eventId: 1, divisionId: 1 });
