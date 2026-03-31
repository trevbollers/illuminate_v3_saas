import { Schema, Document, Types } from "mongoose";

export interface ITryoutDecision extends Document {
  sessionId: Types.ObjectId;
  registrationId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName: string;
  decision: "invited" | "not_invited" | "waitlist";
  teamId?: Types.ObjectId;
  teamName?: string;
  decidedBy: Types.ObjectId;
  decidedAt: Date;
  inviteId?: Types.ObjectId;
  inviteStatus?: "pending" | "accepted" | "rejected";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TryoutDecisionSchema = new Schema<ITryoutDecision>(
  {
    sessionId: { type: Schema.Types.ObjectId, required: true, index: true },
    registrationId: { type: Schema.Types.ObjectId, required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    decision: {
      type: String,
      enum: ["invited", "not_invited", "waitlist"],
      required: true,
    },
    teamId: { type: Schema.Types.ObjectId },
    teamName: { type: String },
    decidedBy: { type: Schema.Types.ObjectId, required: true },
    decidedAt: { type: Date, default: Date.now },
    inviteId: { type: Schema.Types.ObjectId },
    inviteStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
    },
    notes: { type: String },
  },
  { timestamps: true },
);

TryoutDecisionSchema.index({ sessionId: 1, playerId: 1 }, { unique: true });
