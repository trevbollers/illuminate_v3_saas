import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IUniformItem {
  itemName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

// --- Main interface ---

export interface IUniformOrder extends Document {
  teamId: Types.ObjectId;
  playerId: Types.ObjectId;
  familyId: Types.ObjectId;
  items: IUniformItem[];
  totalAmount: number;
  status: "pending" | "ordered" | "shipped" | "delivered" | "canceled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  stripePaymentIntentId?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const UniformOrderSchema = new Schema<IUniformOrder>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    familyId: { type: Schema.Types.ObjectId, required: true },
    items: [
      {
        itemName: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "ordered", "shipped", "delivered", "canceled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    stripePaymentIntentId: { type: String },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

UniformOrderSchema.index({ teamId: 1 });
UniformOrderSchema.index({ familyId: 1 });
