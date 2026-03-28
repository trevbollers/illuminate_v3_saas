import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMagicCode extends Document {
  // Who is this code for
  identifier: string; // email or phone (E.164)
  identifierType: "email" | "phone";

  // The code itself
  code: string; // 6-digit code
  hashedCode: string; // bcrypt hash for verification

  // Lifecycle
  expiresAt: Date;
  usedAt?: Date;
  attempts: number; // failed verification attempts (lockout after 5)

  // Context — what initiated this code
  purpose: "login" | "player_access" | "invite_accept";
  // For player_access codes: who generated it
  generatedBy?: Types.ObjectId;
  // For player_access codes: which family/player this grants access to
  familyId?: Types.ObjectId;
  playerId?: Types.ObjectId;
  // Scoped session metadata
  scopedRole?: string; // e.g., "player_view" for delegated access

  createdAt: Date;
  updatedAt: Date;
}

const MagicCodeSchema = new Schema<IMagicCode>(
  {
    identifier: { type: String, required: true },
    identifierType: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
    code: { type: String, required: true },
    hashedCode: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    attempts: { type: Number, default: 0 },
    purpose: {
      type: String,
      enum: ["login", "player_access", "invite_accept"],
      default: "login",
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    familyId: { type: Schema.Types.ObjectId, ref: "Family" },
    playerId: { type: Schema.Types.ObjectId, ref: "Player" },
    scopedRole: { type: String },
  },
  { timestamps: true },
);

// Find active codes quickly
MagicCodeSchema.index({ identifier: 1, purpose: 1, expiresAt: 1 });
// Auto-cleanup expired codes
MagicCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MagicCode =
  (mongoose.models.MagicCode as mongoose.Model<IMagicCode>) ||
  mongoose.model<IMagicCode>("MagicCode", MagicCodeSchema);
