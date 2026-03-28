import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IMessageAck extends Document {
  messageId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  response: string;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const MessageAckSchema = new Schema<IMessageAck>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    response: { type: String, required: true },
    respondedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

MessageAckSchema.index({ messageId: 1, userId: 1 }, { unique: true });
MessageAckSchema.index({ messageId: 1 });
