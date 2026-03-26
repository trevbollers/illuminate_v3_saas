import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IAttendance extends Document {
  orgEventId: Types.ObjectId;
  teamId: Types.ObjectId;
  playerId: Types.ObjectId;
  playerName: string;
  status: "present" | "absent" | "late" | "excused";
  rsvp?: "yes" | "no" | "maybe" | "no_response";
  checkedInAt?: Date;
  markedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const AttendanceSchema = new Schema<IAttendance>(
  {
    orgEventId: { type: Schema.Types.ObjectId, ref: "OrgEvent", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "absent",
    },
    rsvp: {
      type: String,
      enum: ["yes", "no", "maybe", "no_response"],
      default: "no_response",
    },
    checkedInAt: { type: Date },
    markedBy: { type: Schema.Types.ObjectId },
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ orgEventId: 1 });
AttendanceSchema.index({ playerId: 1 });
AttendanceSchema.index({ teamId: 1 });
