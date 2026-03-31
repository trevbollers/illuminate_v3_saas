import { Schema, Document, Types } from "mongoose";

export interface IHistoricalSummary {
  seasonsWithOrg: number;
  totalGamesPlayed: number;
  attendanceRate: number;
  previousTryoutAvgScore?: number;
}

export interface ITryoutRegistration extends Document {
  sessionId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName: string;
  ageGroup: string;
  tryoutNumber: number;
  paymentStatus: "pending" | "paid" | "waived";
  stripePaymentIntentId?: string;
  historicalBonus: number;
  historicalSummary: IHistoricalSummary;
  createdAt: Date;
  updatedAt: Date;
}

export const TryoutRegistrationSchema = new Schema<ITryoutRegistration>(
  {
    sessionId: { type: Schema.Types.ObjectId, required: true, index: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    ageGroup: { type: String, required: true },
    tryoutNumber: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "waived"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    historicalBonus: { type: Number, default: 0 },
    historicalSummary: {
      seasonsWithOrg: { type: Number, default: 0 },
      totalGamesPlayed: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
      previousTryoutAvgScore: { type: Number },
    },
  },
  { timestamps: true },
);

TryoutRegistrationSchema.index({ sessionId: 1, tryoutNumber: 1 }, { unique: true });
TryoutRegistrationSchema.index({ sessionId: 1, playerId: 1 }, { unique: true });
