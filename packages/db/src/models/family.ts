import mongoose, { Document, Schema, Types } from "mongoose";

// --- Main interface ---

export interface IFamily extends Document {
  name: string;
  guardianUserIds: Types.ObjectId[];
  playerIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const FamilySchema = new Schema<IFamily>(
  {
    name: { type: String, required: true },
    guardianUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    playerIds: [{ type: Schema.Types.ObjectId, ref: "Player" }],
  },
  { timestamps: true }
);

FamilySchema.index({ guardianUserIds: 1 });

export const Family =
  (mongoose.models.Family as mongoose.Model<IFamily>) ||
  mongoose.model<IFamily>("Family", FamilySchema);
