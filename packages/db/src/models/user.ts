import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

// --- Sub-interfaces ---

export interface IMembership {
  tenantId: Types.ObjectId;
  role: "owner" | "admin" | "manager" | "staff" | "viewer";
  locationAccess: Types.ObjectId[];
  permissions: string[];
  isActive: boolean;
  joinedAt: Date;
}

// --- Main interface ---

export interface IUser extends Document {
  email: string;
  emailVerified?: Date;
  passwordHash?: string;
  name: string;
  image?: string;
  phone?: string;
  platformRole?: "super_admin" | null;
  memberships: IMembership[];
  activeTenantId?: Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const MembershipSchema = new Schema<IMembership>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "staff", "viewer"],
      required: true,
    },
    locationAccess: [{ type: Schema.Types.ObjectId }],
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Date },
    passwordHash: { type: String },
    name: { type: String, required: true },
    image: { type: String },
    phone: { type: String },
    platformRole: {
      type: String,
      enum: ["super_admin", null],
      default: null,
    },
    memberships: [MembershipSchema],
    activeTenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook for password hashing
UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash") || !this.passwordHash) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "memberships.tenantId": 1 });

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
