import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ICartItem {
  leagueSlug: string;
  leagueName: string;
  eventId: string;
  eventName: string;
  divisionId: string;
  divisionLabel: string;
  teamId: Types.ObjectId;
  teamName: string;
  sport: string;
  unitPriceCents: number;
  addedAt: Date;
  addedBy: Types.ObjectId;
}

export interface ICartCheckout {
  leagueSlug: string;
  stripeSessionId?: string;
  status: "pending" | "paid" | "failed" | "expired";
  amountCents: number;
  paidAt?: Date;
  registrationIds: string[];
}

// --- Main interface ---

export interface IRegistrationCart extends Document {
  orgTenantId: Types.ObjectId;
  status: "active" | "checking_out" | "completed" | "abandoned";
  items: ICartItem[];
  checkouts: ICartCheckout[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const CartItemSchema = new Schema<ICartItem>(
  {
    leagueSlug: { type: String, required: true },
    leagueName: { type: String, required: true },
    eventId: { type: String, required: true },
    eventName: { type: String, required: true },
    divisionId: { type: String, required: true },
    divisionLabel: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, required: true },
    teamName: { type: String, required: true },
    sport: { type: String, required: true },
    unitPriceCents: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: true },
);

const CartCheckoutSchema = new Schema<ICartCheckout>(
  {
    leagueSlug: { type: String, required: true },
    stripeSessionId: { type: String },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending",
    },
    amountCents: { type: Number, required: true },
    paidAt: { type: Date },
    registrationIds: [{ type: String }],
  },
  { _id: false },
);

export const RegistrationCartSchema = new Schema<IRegistrationCart>(
  {
    orgTenantId: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ["active", "checking_out", "completed", "abandoned"],
      default: "active",
    },
    items: [CartItemSchema],
    checkouts: [CartCheckoutSchema],
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

RegistrationCartSchema.index({ orgTenantId: 1, status: 1 });
