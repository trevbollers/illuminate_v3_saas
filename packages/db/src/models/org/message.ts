import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IMessage extends Document {
  teamId?: Types.ObjectId;
  channel: "team" | "coaches" | "parents" | "org";
  authorId: Types.ObjectId;
  authorName: string;
  body: string;
  pinned: boolean;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const MessageSchema = new Schema<IMessage>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    channel: {
      type: String,
      enum: ["team", "coaches", "parents", "org"],
      required: true,
    },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

MessageSchema.index({ teamId: 1, createdAt: -1 });
MessageSchema.index({ channel: 1 });
