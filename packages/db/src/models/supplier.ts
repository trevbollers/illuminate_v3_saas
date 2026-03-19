import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ISupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// --- Main interface ---

export interface ISupplier extends Document {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address: ISupplierAddress;
  paymentTerms?: "net30" | "net60" | "cod";
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema (exported for tenant-connection registration) ---

export const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
    },
    paymentTerms: {
      type: String,
      enum: ["net30", "net60", "cod"],
    },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ createdAt: -1 });

export const Supplier =
  (mongoose.models.Supplier as mongoose.Model<ISupplier>) ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema);
