import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IRecurrence {
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  daysOfWeek?: number[];
  endDate?: Date;
}

// --- Main interface ---

export interface IOrgEvent extends Document {
  teamId: Types.ObjectId;
  title: string;
  type: "practice" | "scrimmage" | "meeting" | "tryout" | "other";
  location?: {
    name: string;
    address?: string;
  };
  startTime: Date;
  endTime: Date;
  recurrence?: IRecurrence;
  notes?: string;
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
      enum: ["practice", "scrimmage", "meeting", "tryout", "other"],
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
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

OrgEventSchema.index({ teamId: 1, startTime: 1 });
OrgEventSchema.index({ type: 1 });
