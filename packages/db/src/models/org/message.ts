import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IDeliveryLogEntry {
  channel: "email" | "sms";
  recipientUserId: Types.ObjectId;
  sentAt: Date;
  status: "sent" | "failed";
  externalId?: string;
}

// --- Main interface ---

export interface IMessage extends Document {
  teamId?: Types.ObjectId;
  channel: "team" | "coaches" | "parents" | "org";
  authorId: Types.ObjectId;
  authorName: string;
  subject?: string;
  body: string;
  priority: "normal" | "urgent";
  requiresAck: boolean;
  ackOptions: string[];
  deliveryChannels: ("in_app" | "email" | "sms")[];
  recipientUserIds: Types.ObjectId[];
  pinned: boolean;
  readBy: Types.ObjectId[];
  deliveryLog: IDeliveryLogEntry[];
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
    subject: { type: String },
    body: { type: String, required: true },
    priority: { type: String, enum: ["normal", "urgent"], default: "normal" },
    requiresAck: { type: Boolean, default: false },
    ackOptions: [{ type: String }],
    deliveryChannels: [{ type: String, enum: ["in_app", "email", "sms"] }],
    recipientUserIds: [{ type: Schema.Types.ObjectId }],
    pinned: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId }],
    deliveryLog: [
      {
        channel: { type: String, enum: ["email", "sms"] },
        recipientUserId: { type: Schema.Types.ObjectId },
        sentAt: { type: Date },
        status: { type: String, enum: ["sent", "failed"] },
        externalId: { type: String },
      },
    ],
  },
  { timestamps: true }
);

MessageSchema.index({ teamId: 1, createdAt: -1 });
MessageSchema.index({ channel: 1 });
MessageSchema.index({ recipientUserIds: 1, createdAt: -1 });
MessageSchema.index({ priority: 1 });
