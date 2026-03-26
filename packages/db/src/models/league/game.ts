import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IGame extends Document {
  eventId: Types.ObjectId;
  divisionId: Types.ObjectId;
  bracketId?: Types.ObjectId;
  poolId?: Types.ObjectId;

  // Teams
  homeTeamId?: Types.ObjectId;
  awayTeamId?: Types.ObjectId;
  homeTeamName: string;
  awayTeamName: string;

  // Scoring
  homeScore?: number;
  awayScore?: number;
  winnerId?: Types.ObjectId;

  // Schedule slot
  scheduledAt: Date; // full datetime of game start
  dayIndex: number; // 0-based index into event.days[]
  locationName: string; // which venue
  field: string; // which field/court at that venue
  timeSlot: string; // e.g. "08:00" — the start time string for grid alignment
  sport: string;

  // Game info
  round?: string; // "Pool Play", "Quarterfinal", "Semifinal", "Championship"
  gameNumber?: number; // sequential game # within event

  // Status
  status: "scheduled" | "in_progress" | "completed" | "canceled" | "forfeit";
  stats: Record<string, unknown>;
  scoredBy?: Types.ObjectId;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const GameSchema = new Schema<IGame>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    bracketId: { type: Schema.Types.ObjectId, ref: "Bracket" },
    poolId: { type: Schema.Types.ObjectId },

    homeTeamId: { type: Schema.Types.ObjectId },
    awayTeamId: { type: Schema.Types.ObjectId },
    homeTeamName: { type: String, required: true },
    awayTeamName: { type: String, required: true },

    homeScore: { type: Number },
    awayScore: { type: Number },
    winnerId: { type: Schema.Types.ObjectId },

    scheduledAt: { type: Date, required: true },
    dayIndex: { type: Number, required: true, default: 0 },
    locationName: { type: String, required: true },
    field: { type: String, required: true },
    timeSlot: { type: String, required: true },
    sport: { type: String, required: true },

    round: { type: String },
    gameNumber: { type: Number },

    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "canceled", "forfeit"],
      default: "scheduled",
    },
    stats: { type: Schema.Types.Mixed, default: {} },
    scoredBy: { type: Schema.Types.ObjectId },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

GameSchema.index({ eventId: 1, divisionId: 1 });
GameSchema.index({ eventId: 1, dayIndex: 1, field: 1 });
GameSchema.index({ scheduledAt: 1 });
GameSchema.index({ status: 1 });
