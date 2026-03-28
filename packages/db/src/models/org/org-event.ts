import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IRecurrence {
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  daysOfWeek?: number[];
  endDate?: Date;
}

export type OrgEventType = "practice" | "scrimmage" | "meeting" | "tryout" | "game" | "tournament" | "other";

export interface IEventResult {
  ourScore?: number;
  theirScore?: number;
  outcome?: "win" | "loss" | "tie";
}

// --- Main interface ---

export interface IOrgEvent extends Document {
  teamId: Types.ObjectId;
  title: string;
  type: OrgEventType;
  location?: {
    name: string;
    address?: string;
  };
  startTime: Date;
  endTime: Date;
  recurrence?: IRecurrence;
  notes?: string;
  opponentName?: string;
  homeAway?: "home" | "away" | "neutral";
  leagueEventId?: string;
  result?: IEventResult;
  isCancelled?: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const OrgEventSchema = new Schema<IOrgEvent>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["practice", "scrimmage", "meeting", "tryout", "game", "tournament", "other"],
      required: true,
    },
    location: {
      name: { type: String },
      address: { type: String },
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    recurrence: {
      frequency: { type: String, enum: ["daily", "weekly", "biweekly", "monthly"] },
      daysOfWeek: [{ type: Number }],
      endDate: { type: Date },
    },
    notes: { type: String },
    opponentName: { type: String },
    homeAway: { type: String, enum: ["home", "away", "neutral"] },
    leagueEventId: { type: String },
    result: {
      ourScore: { type: Number },
      theirScore: { type: Number },
      outcome: { type: String, enum: ["win", "loss", "tie"] },
    },
    isCancelled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

OrgEventSchema.index({ teamId: 1, startTime: 1 });
OrgEventSchema.index({ startTime: 1, endTime: 1 });
OrgEventSchema.index({ type: 1 });
