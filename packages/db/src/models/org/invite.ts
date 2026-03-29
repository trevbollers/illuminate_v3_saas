import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IInvite extends Document {
  teamId: Types.ObjectId;
  email?: string;
  phone?: string;
  token: string;
  role: "player" | "coach" | "manager" | "viewer";
  status: "pending" | "accepted" | "expired" | "revoked";
  invitedBy: Types.ObjectId;
  acceptedBy?: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const InviteSchema = new Schema<IInvite>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    email: { type: String },
    phone: { type: String },
    token: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["player", "coach", "manager", "viewer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
    },
    invitedBy: { type: Schema.Types.ObjectId, required: true },
    acceptedBy: { type: Schema.Types.ObjectId },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

InviteSchema.index({ teamId: 1, status: 1 });
InviteSchema.index({ email: 1 });
