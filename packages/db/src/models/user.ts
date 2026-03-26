import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

// --- Sub-interfaces ---

export interface IMembership {
  tenantId: Types.ObjectId;
  tenantType: "league" | "organization";
  role: string;
  teamIds: Types.ObjectId[];
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
  platformRole?: "gp_admin" | "gp_support" | null;
  platformPermissions: string[];
  memberships: IMembership[];
  activeTenantId?: Types.ObjectId;
  familyId?: Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const MembershipSchema = new Schema<IMembership>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    tenantType: {
      type: String,
      enum: ["league", "organization"],
      required: true,
    },
    role: { type: String, required: true },
    teamIds: [{ type: Schema.Types.ObjectId }],
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
      enum: ["gp_admin", "gp_support", null],
      default: null,
    },
    platformPermissions: [{ type: String }],
    memberships: [MembershipSchema],
    activeTenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
    familyId: { type: Schema.Types.ObjectId, ref: "Family" },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

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

UserSchema.index({ "memberships.tenantId": 1 });
UserSchema.index({ familyId: 1 });

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
