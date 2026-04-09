import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IRosterEntry {
  playerId: Types.ObjectId;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  eligibilityStatus: "eligible" | "pending_verification" | "ineligible";
}

// --- Main interface ---

export interface IRegistration extends Document {
  eventId: Types.ObjectId;
  divisionId?: Types.ObjectId;
  orgTenantId: Types.ObjectId;
  teamId?: Types.ObjectId;
  teamName: string;
  roster: IRosterEntry[];
  status: "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn";
  paymentStatus: "unpaid" | "paid" | "refunded" | "partial";
  stripePaymentIntentId?: string;
  amountPaid: number;
  registeredBy: Types.ObjectId;
  notes?: string;
  champion?: boolean;
  finalist?: boolean;
  championDivision?: string;
  bracketTier?: string; // "Gold", "Silver", "Bronze" etc.
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const RegistrationSchema = new Schema<IRegistration>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division" },
    orgTenantId: { type: Schema.Types.ObjectId, required: true },
    teamId: { type: Schema.Types.ObjectId },
    teamName: { type: String, required: true },
    roster: [
      {
        playerId: { type: Schema.Types.ObjectId, required: true },
        playerName: { type: String, required: true },
        jerseyNumber: { type: Number },
        position: { type: String },
        eligibilityStatus: {
          type: String,
          enum: ["eligible", "pending_verification", "ineligible"],
          default: "pending_verification",
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "waitlisted", "withdrawn"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partial"],
      default: "unpaid",
    },
    stripePaymentIntentId: { type: String },
    amountPaid: { type: Number, default: 0 },
    registeredBy: { type: Schema.Types.ObjectId, required: true },
    notes: { type: String },
    champion: { type: Boolean, default: false },
    finalist: { type: Boolean, default: false },
    championDivision: { type: String },
    bracketTier: { type: String },
  },
  { timestamps: true }
);

RegistrationSchema.index({ eventId: 1, divisionId: 1 });
RegistrationSchema.index({ orgTenantId: 1 });
RegistrationSchema.index({ status: 1 });
