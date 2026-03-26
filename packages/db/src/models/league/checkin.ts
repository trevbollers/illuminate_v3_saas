import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface ICheckIn extends Document {
  eventId: Types.ObjectId;
  divisionId: Types.ObjectId;
  registrationId: Types.ObjectId;
  playerId: Types.ObjectId; // references platform DB Player
  playerName: string;
  teamName: string;
  jerseyNumber?: number;

  // Check-in result
  status: "checked_in" | "rejected";
  rejectReason?: string;
  // e.g. "not_on_roster", "ineligible", "unpaid", "already_checked_in",
  //      "registration_not_approved", "event_not_active"

  // Which day of the event (for multi-day events)
  dayIndex: number;
  dayLabel?: string;

  // Who performed the scan
  scannedBy: Types.ObjectId;
  scannedByName?: string;
  scannedAt: Date;

  // QR code data used (for audit trail)
  qrPayload?: string;

  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const CheckInSchema = new Schema<ICheckIn>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: "Registration", required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    teamName: { type: String, required: true },
    jerseyNumber: { type: Number },

    status: {
      type: String,
      enum: ["checked_in", "rejected"],
      required: true,
    },
    rejectReason: { type: String },

    dayIndex: { type: Number, required: true, default: 0 },
    dayLabel: { type: String },

    scannedBy: { type: Schema.Types.ObjectId, required: true },
    scannedByName: { type: String },
    scannedAt: { type: Date, required: true, default: Date.now },

    qrPayload: { type: String },
  },
  { timestamps: true },
);

CheckInSchema.index({ eventId: 1, dayIndex: 1 });
CheckInSchema.index({ eventId: 1, playerId: 1, dayIndex: 1 });
CheckInSchema.index({ registrationId: 1, dayIndex: 1 });
CheckInSchema.index({ scannedAt: -1 });
