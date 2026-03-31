import { Schema, Document, Types } from "mongoose";

export interface IProgramRegistration extends Document {
  programId: Types.ObjectId;
  programSlug: string;
  programName: string;
  programType: string;

  // Player
  playerId?: Types.ObjectId;
  playerName: string;
  ageGroup?: string;

  // Contact (required for sale)
  parentEmail: string;
  parentPhone?: string;
  parentName?: string;

  // Payment
  fee: number;                         // In cents
  paymentStatus: "pending" | "paid" | "refunded" | "waived";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;

  // Check-in
  checkInCode: string;                 // Unique code for QR (e.g. "PRG-A7X9K2")
  checkedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;

  // Metadata
  registeredAt: Date;
  registeredBy?: Types.ObjectId;       // Could be parent or admin
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ProgramRegistrationSchema = new Schema<IProgramRegistration>(
  {
    programId: { type: Schema.Types.ObjectId, required: true },
    programSlug: { type: String },
    programName: { type: String },
    programType: { type: String },

    playerId: { type: Schema.Types.ObjectId },
    playerName: { type: String, required: true },
    ageGroup: { type: String },

    parentEmail: { type: String, required: true },
    parentPhone: { type: String },
    parentName: { type: String },

    fee: { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "waived"],
      default: "pending",
    },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    paidAt: { type: Date },

    checkInCode: { type: String, required: true, unique: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId },

    registeredAt: { type: Date, default: Date.now },
    registeredBy: { type: Schema.Types.ObjectId },
    notes: { type: String },
  },
  { timestamps: true },
);

ProgramRegistrationSchema.index({ programId: 1 });
ProgramRegistrationSchema.index({ checkInCode: 1 }, { unique: true });
ProgramRegistrationSchema.index({ parentEmail: 1 });
ProgramRegistrationSchema.index({ paymentStatus: 1 });
