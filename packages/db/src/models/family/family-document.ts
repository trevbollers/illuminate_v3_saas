import { Schema, Document, Types } from "mongoose";

export interface IFamilyDocument extends Document {
  playerId: Types.ObjectId;
  documentType: "birth_certificate" | "passport" | "school_id" | "state_id" | "medical_form" | "insurance_card" | "photo_id" | "other";
  fileName: string;
  mimeType: string;
  sizeBytes: number;

  // Encryption
  encryptedUrl: string;              // Path to encrypted blob (S3 key or local path)
  encryptionMethod: "aes-256-gcm";
  encryptionKeyId: string;           // Reference to family's encryption key

  // Metadata
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;        // Guardian who uploaded
  description?: string;

  // Retention
  retentionPolicy: "keep" | "delete_after_verification" | "delete_after_days";
  retentionDays?: number;
  scheduledDeletionAt?: Date;
  deletedAt?: Date;

  // Link to verification
  verificationRecordId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const FamilyDocumentSchema = new Schema<IFamilyDocument>(
  {
    playerId: { type: Schema.Types.ObjectId, required: true },
    documentType: {
      type: String,
      enum: ["birth_certificate", "passport", "school_id", "state_id", "medical_form", "insurance_card", "photo_id", "other"],
      required: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    encryptedUrl: { type: String, required: true },
    encryptionMethod: { type: String, default: "aes-256-gcm" },
    encryptionKeyId: { type: String, required: true },

    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, required: true },
    description: { type: String },

    retentionPolicy: {
      type: String,
      enum: ["keep", "delete_after_verification", "delete_after_days"],
      default: "keep",
    },
    retentionDays: { type: Number },
    scheduledDeletionAt: { type: Date },
    deletedAt: { type: Date },

    verificationRecordId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

FamilyDocumentSchema.index({ playerId: 1 });
FamilyDocumentSchema.index({ documentType: 1 });
