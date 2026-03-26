import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface ITransaction extends Document {
  teamId?: Types.ObjectId;
  familyId: Types.ObjectId;
  playerId?: Types.ObjectId;
  type: "dues" | "event_fee" | "uniform" | "fundraiser" | "other";
  description: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  stripePaymentIntentId?: string;
  paidAt?: Date;
  dueDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const TransactionSchema = new Schema<ITransaction>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    familyId: { type: Schema.Types.ObjectId, required: true },
    playerId: { type: Schema.Types.ObjectId },
    type: {
      type: String,
      enum: ["dues", "event_fee", "uniform", "fundraiser", "other"],
      required: true,
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    paidAt: { type: Date },
    dueDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ familyId: 1 });
TransactionSchema.index({ teamId: 1 });
TransactionSchema.index({ status: 1 });
