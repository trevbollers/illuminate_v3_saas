import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  configOptions: { label: string; value: string }[];
  lineTotal: number;
}

export interface IOrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  userId?: Types.ObjectId;
}

export interface IOrderFulfillment {
  method: "ship" | "pickup";
  address?: {
    street: string;
    apartment?: string;
    city: string;
    state: string;
    zip: string;
  };
  status: "pending" | "processing" | "shipped" | "delivered" | "picked_up";
  trackingNumber?: string;
}

// --- Main interface ---

export interface IStorefrontOrder extends Document {
  orderNumber: string;
  customer: IOrderCustomer;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  fulfillment: IOrderFulfillment;
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partial";
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  /** For recurring/dues: Stripe subscription ID */
  stripeSubscriptionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const StorefrontOrderSchema = new Schema<IStorefrontOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
      userId: { type: Schema.Types.ObjectId },
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        category: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        configOptions: [
          {
            label: { type: String },
            value: { type: String },
          },
        ],
        lineTotal: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    fulfillment: {
      method: { type: String, enum: ["ship", "pickup"], default: "pickup" },
      address: {
        street: { type: String },
        apartment: { type: String },
        city: { type: String },
        state: { type: String },
        zip: { type: String },
      },
      status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "picked_up"],
        default: "pending",
      },
      trackingNumber: { type: String },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partial"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    stripeSessionId: { type: String },
    stripeSubscriptionId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

StorefrontOrderSchema.index({ "customer.email": 1 });
StorefrontOrderSchema.index({ paymentStatus: 1 });
StorefrontOrderSchema.index({ createdAt: -1 });
