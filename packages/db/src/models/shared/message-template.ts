import { Schema, Document, Types } from "mongoose";

export interface IMessageTemplate extends Document {
  name: string;
  description: string;
  category: "general" | "scheduling" | "payment" | "roster" | "event" | "safety" | "custom";
  subject: string;
  body: string;
  /** Whether this is a system-provided default (not deletable) */
  isSystem: boolean;
  /** Who created it — null for system defaults */
  createdByUserId?: Types.ObjectId;
  createdByName?: string;
  /** Context: "message" for org team messages, "announcement" for league announcements */
  context: "message" | "announcement";
  /** Optional: suggested priority for this template */
  suggestedPriority?: "normal" | "urgent";
  /** Optional: suggested ack options */
  suggestedAckOptions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const MessageTemplateSchema = new Schema<IMessageTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["general", "scheduling", "payment", "roster", "event", "safety", "custom"],
      default: "custom",
    },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    createdByUserId: { type: Schema.Types.ObjectId },
    createdByName: { type: String },
    context: {
      type: String,
      enum: ["message", "announcement"],
      required: true,
    },
    suggestedPriority: { type: String, enum: ["normal", "urgent"] },
    suggestedAckOptions: [{ type: String }],
  },
  { timestamps: true }
);

MessageTemplateSchema.index({ context: 1, category: 1 });
MessageTemplateSchema.index({ isSystem: 1 });
