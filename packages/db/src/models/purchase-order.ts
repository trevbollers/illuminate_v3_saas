import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IPurchaseOrderItem {
  ingredientId: Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

// --- Main interface ---

export interface IPurchaseOrder extends Document {
  tenantId: Types.ObjectId;
  locationId: Types.ObjectId;
  poNumber: string;
  supplierId: Types.ObjectId;
  items: IPurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status:
    | "draft"
    | "submitted"
    | "confirmed"
    | "received"
    | "partial"
    | "canceled";
  expectedDelivery?: Date;
  receivedDate?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    poNumber: { type: String, required: true },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: [
      {
        ingredientId: {
          type: Schema.Types.ObjectId,
          ref: "Ingredient",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        unitCost: { type: Number, required: true },
        totalCost: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "confirmed",
        "received",
        "partial",
        "canceled",
      ],
      default: "draft",
    },
    expectedDelivery: { type: Date },
    receivedDate: { type: Date },
    notes: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes
PurchaseOrderSchema.index(
  { tenantId: 1, poNumber: 1 },
  { unique: true }
);
PurchaseOrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });
PurchaseOrderSchema.index({ tenantId: 1, createdAt: -1 });

export const PurchaseOrder =
  (mongoose.models.PurchaseOrder as mongoose.Model<IPurchaseOrder>) ||
  mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
