import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ISalesOrderCustomer {
  type: "b2b" | "b2c";
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface ISalesOrderItem {
  productId: Types.ObjectId;
  name: string;
  configuration?: Record<string, unknown>;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ISalesOrderDiscount {
  type?: string;
  value?: number;
}

// --- Main interface ---

export interface ISalesOrder extends Document {
  locationId?: Types.ObjectId;
  orderNumber: string;
  customer: ISalesOrderCustomer;
  items: ISalesOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount?: ISalesOrderDiscount;
  total: number;
  status:
    | "quote"
    | "pending"
    | "confirmed"
    | "processing"
    | "ready"
    | "shipped"
    | "delivered"
    | "canceled";
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  quoteValidUntil?: Date;
  stripePaymentIntentId?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema (exported for tenant-connection registration) ---

export const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    locationId: {
      type: Schema.Types.ObjectId,
    },
    orderNumber: { type: String, required: true },
    customer: {
      type: {
        type: String,
        enum: ["b2b", "b2c"],
        required: true,
      },
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      company: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zip: { type: String },
      },
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        configuration: { type: Schema.Types.Mixed },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: {
      type: { type: String },
      value: { type: Number },
    },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: [
        "quote",
        "pending",
        "confirmed",
        "processing",
        "ready",
        "shipped",
        "delivered",
        "canceled",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded"],
      default: "unpaid",
    },
    quoteValidUntil: { type: Date },
    stripePaymentIntentId: { type: String },
    notes: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes
SalesOrderSchema.index({ orderNumber: 1 }, { unique: true });
SalesOrderSchema.index({ status: 1, createdAt: -1 });
SalesOrderSchema.index({ "customer.email": 1 });
SalesOrderSchema.index({ createdAt: -1 });

export const SalesOrder =
  (mongoose.models.SalesOrder as mongoose.Model<ISalesOrder>) ||
  mongoose.model<ISalesOrder>("SalesOrder", SalesOrderSchema);
