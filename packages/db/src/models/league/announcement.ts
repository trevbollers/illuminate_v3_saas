import { Schema, Document, Types } from "mongoose";

// --- Main interface ---

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  authorId: Types.ObjectId;
  authorName: string;
  priority: "normal" | "urgent";
  targetType: "all_registered" | "event" | "division";
  targetEventId?: Types.ObjectId;
  targetDivisionId?: Types.ObjectId;
  deliveryChannels: ("in_app" | "email")[];
  readByOrgAdmins: Types.ObjectId[];
  deliveryLog: {
    orgTenantId: Types.ObjectId;
    adminUserId: Types.ObjectId;
    channel: "email";
    sentAt: Date;
    status: "sent" | "failed";
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

export const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true },
    priority: { type: String, enum: ["normal", "urgent"], default: "normal" },
    targetType: {
      type: String,
      enum: ["all_registered", "event", "division"],
      required: true,
    },
    targetEventId: { type: Schema.Types.ObjectId },
    targetDivisionId: { type: Schema.Types.ObjectId },
    deliveryChannels: [{ type: String, enum: ["in_app", "email"] }],
    readByOrgAdmins: [{ type: Schema.Types.ObjectId }],
    deliveryLog: [
      {
        orgTenantId: { type: Schema.Types.ObjectId },
        adminUserId: { type: Schema.Types.ObjectId },
        channel: { type: String, enum: ["email"] },
        sentAt: { type: Date },
        status: { type: String, enum: ["sent", "failed"] },
      },
    ],
  },
  { timestamps: true }
);

AnnouncementSchema.index({ targetEventId: 1, createdAt: -1 });
AnnouncementSchema.index({ createdAt: -1 });
